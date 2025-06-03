const puppeteer = require('puppeteer');
const axeCore = require('axe-core');
const fs = require('fs').promises;
const path = require('path');

/**
 * Accessibility Testing with axe-core
 * Automated WCAG 2.1 AA compliance testing
 */
class AccessibilityTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = [];
  }

  /**
   * Initialize browser and page
   */
  async initialize() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });
    
    this.page = await this.browser.newPage();
    
    // Set viewport for consistent testing
    await this.page.setViewport({
      width: 1280,
      height: 720
    });

    // Inject axe-core into the page
    await this.page.addScriptTag({
      path: require.resolve('axe-core')
    });
  }

  /**
   * Wait for app to be ready
   * @param {number} timeout - Maximum wait time in milliseconds
   */
  async waitForAppReady(timeout = 30000) {
    try {
      // Wait for React to load
      await this.page.waitForSelector('[data-testid], .App, #root > div', {
        timeout
      });
      
      // Additional wait for dynamic content
      await this.page.waitForTimeout(2000);
      
      console.log('App appears to be ready for accessibility testing');
    } catch (error) {
      console.warn('Could not detect app readiness, proceeding with testing:', error.message);
    }
  }

  /**
   * Run accessibility audit on the current page
   * @param {object} options - Axe options
   * @returns {Promise<object>} Accessibility results
   */
  async runAudit(options = {}) {
    const defaultOptions = {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21aa']
      },
      resultTypes: ['violations', 'incomplete', 'passes'],
      ...options
    };

    try {
      // Run axe-core audit
      const results = await this.page.evaluate((axeOptions) => {
        return axe.run(document, axeOptions);
      }, defaultOptions);

      return {
        url: await this.page.url(),
        timestamp: new Date().toISOString(),
        ...results
      };
    } catch (error) {
      console.error('Accessibility audit failed:', error);
      throw new Error(`Accessibility audit failed: ${error.message}`);
    }
  }

  /**
   * Test accessibility of a specific URL
   * @param {string} url - URL to test
   * @param {object} options - Test options
   * @returns {Promise<object>} Accessibility results
   */
  async testUrl(url, options = {}) {
    try {
      console.log(`Testing accessibility for: ${url}`);
      
      // Navigate to URL
      await this.page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Wait for app to be ready
      await this.waitForAppReady();

      // Run accessibility audit
      const results = await this.runAudit(options);
      
      // Store results
      this.results.push(results);
      
      return results;
    } catch (error) {
      console.error(`Failed to test ${url}:`, error);
      return {
        url,
        timestamp: new Date().toISOString(),
        error: error.message,
        violations: [],
        incomplete: [],
        passes: []
      };
    }
  }

  /**
   * Test multiple URLs
   * @param {Array<string>} urls - URLs to test
   * @returns {Promise<Array<object>>} Results for all URLs
   */
  async testMultipleUrls(urls) {
    const results = [];
    
    for (const url of urls) {
      const result = await this.testUrl(url);
      results.push(result);
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
  }

  /**
   * Generate accessibility report
   * @param {Array<object>} results - Accessibility results
   * @returns {object} Formatted report
   */
  generateReport(results = this.results) {
    const report = {
      summary: {
        totalPages: results.length,
        totalViolations: 0,
        totalIncomplete: 0,
        totalPasses: 0,
        timestamp: new Date().toISOString()
      },
      pages: [],
      violationsByImpact: {
        critical: [],
        serious: [],
        moderate: [],
        minor: []
      },
      recommendedFixes: []
    };

    results.forEach(result => {
      if (result.error) {
        report.pages.push({
          url: result.url,
          error: result.error,
          timestamp: result.timestamp
        });
        return;
      }

      const pageReport = {
        url: result.url,
        timestamp: result.timestamp,
        violations: result.violations.length,
        incomplete: result.incomplete.length,
        passes: result.passes.length,
        violationDetails: result.violations.map(violation => ({
          id: violation.id,
          impact: violation.impact,
          description: violation.description,
          help: violation.help,
          helpUrl: violation.helpUrl,
          nodes: violation.nodes.length,
          tags: violation.tags
        }))
      };

      report.pages.push(pageReport);
      
      // Update summary
      report.summary.totalViolations += result.violations.length;
      report.summary.totalIncomplete += result.incomplete.length;
      report.summary.totalPasses += result.passes.length;

      // Group violations by impact
      result.violations.forEach(violation => {
        const impact = violation.impact || 'minor';
        if (report.violationsByImpact[impact]) {
          report.violationsByImpact[impact].push({
            page: result.url,
            ...violation
          });
        }
      });
    });

    // Generate recommended fixes
    report.recommendedFixes = this.generateRecommendations(report.violationsByImpact);

    // Calculate compliance score
    const totalTests = report.summary.totalViolations + report.summary.totalPasses;
    report.summary.complianceScore = totalTests > 0 
      ? Math.round((report.summary.totalPasses / totalTests) * 100)
      : 0;

    return report;
  }

  /**
   * Generate accessibility recommendations
   * @param {object} violationsByImpact - Violations grouped by impact
   * @returns {Array<object>} Recommendations
   */
  generateRecommendations(violationsByImpact) {
    const recommendations = [];
    const commonIssues = new Map();

    // Count occurrences of each violation type
    Object.values(violationsByImpact).flat().forEach(violation => {
      const key = violation.id;
      if (commonIssues.has(key)) {
        commonIssues.set(key, {
          ...commonIssues.get(key),
          count: commonIssues.get(key).count + 1
        });
      } else {
        commonIssues.set(key, {
          id: violation.id,
          description: violation.description,
          help: violation.help,
          helpUrl: violation.helpUrl,
          impact: violation.impact,
          count: 1
        });
      }
    });

    // Sort by impact and frequency
    const sortedIssues = Array.from(commonIssues.values())
      .sort((a, b) => {
        const impactOrder = { critical: 4, serious: 3, moderate: 2, minor: 1 };
        const impactDiff = (impactOrder[b.impact] || 0) - (impactOrder[a.impact] || 0);
        if (impactDiff !== 0) return impactDiff;
        return b.count - a.count;
      });

    // Generate top recommendations
    sortedIssues.slice(0, 10).forEach((issue, index) => {
      recommendations.push({
        priority: index + 1,
        issue: issue.id,
        description: issue.description,
        solution: issue.help,
        learnMore: issue.helpUrl,
        impact: issue.impact,
        affectedPages: issue.count
      });
    });

    return recommendations;
  }

  /**
   * Save report to file
   * @param {object} report - Accessibility report
   * @param {string} format - Output format ('json' or 'html')
   * @param {string} outputPath - Output file path
   */
  async saveReport(report, format = 'json', outputPath = null) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultPath = outputPath || `accessibility-report-${timestamp}.${format}`;

    try {
      if (format === 'json') {
        await fs.writeFile(defaultPath, JSON.stringify(report, null, 2));
      } else if (format === 'html') {
        const html = this.generateHtmlReport(report);
        await fs.writeFile(defaultPath, html);
      }
      
      console.log(`Accessibility report saved to: ${defaultPath}`);
      return defaultPath;
    } catch (error) {
      console.error('Failed to save report:', error);
      throw error;
    }
  }

  /**
   * Generate HTML report
   * @param {object} report - Accessibility report
   * @returns {string} HTML content
   */
  generateHtmlReport(report) {
    const { summary, pages, violationsByImpact, recommendedFixes } = report;
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Accessibility Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .metric { background: white; padding: 15px; border-left: 4px solid #007cba; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .violations { margin: 20px 0; }
        .impact-critical { border-left-color: #d73027; }
        .impact-serious { border-left-color: #fc8d59; }
        .impact-moderate { border-left-color: #fee08b; }
        .impact-minor { border-left-color: #d9ef8b; }
        .violation { margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 3px; }
        .recommendations { background: #f9f9f9; padding: 20px; border-radius: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
        .score { font-size: 2em; font-weight: bold; color: ${summary.complianceScore >= 80 ? '#4CAF50' : summary.complianceScore >= 60 ? '#FF9800' : '#F44336'}; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Accessibility Report</h1>
        <p>Generated on: ${summary.timestamp}</p>
        <div class="score">Compliance Score: ${summary.complianceScore}%</div>
    </div>

    <div class="summary">
        <div class="metric">
            <h3>Pages Tested</h3>
            <p>${summary.totalPages}</p>
        </div>
        <div class="metric">
            <h3>Total Violations</h3>
            <p>${summary.totalViolations}</p>
        </div>
        <div class="metric">
            <h3>Tests Passed</h3>
            <p>${summary.totalPasses}</p>
        </div>
        <div class="metric">
            <h3>Incomplete</h3>
            <p>${summary.totalIncomplete}</p>
        </div>
    </div>

    <h2>Violations by Impact</h2>
    ${Object.entries(violationsByImpact).map(([impact, violations]) => `
        <div class="violations">
            <h3 class="impact-${impact}">${impact.toUpperCase()} (${violations.length})</h3>
            ${violations.slice(0, 5).map(v => `
                <div class="violation">
                    <strong>${v.id}</strong>: ${v.description}
                    <br><small>Page: ${v.page}</small>
                </div>
            `).join('')}
        </div>
    `).join('')}

    <h2>Page Results</h2>
    <table>
        <thead>
            <tr>
                <th>URL</th>
                <th>Violations</th>
                <th>Incomplete</th>
                <th>Passes</th>
            </tr>
        </thead>
        <tbody>
            ${pages.map(page => `
                <tr>
                    <td>${page.url}</td>
                    <td>${page.violations || 'Error'}</td>
                    <td>${page.incomplete || '-'}</td>
                    <td>${page.passes || '-'}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="recommendations">
        <h2>Top Recommendations</h2>
        <ol>
            ${recommendedFixes.map(fix => `
                <li>
                    <strong>${fix.issue}</strong> (${fix.impact})
                    <br>${fix.description}
                    <br><em>Solution:</em> ${fix.solution}
                    <br><small>Affects ${fix.affectedPages} page(s)</small>
                </li>
            `).join('')}
        </ol>
    </div>
</body>
</html>
    `.trim();
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Main execution function
async function runAccessibilityTests() {
  const tester = new AccessibilityTester();
  
  try {
    await tester.initialize();
    
    // URLs to test (customize as needed)
    const urls = [
      'http://localhost:3000',
      // Add more URLs as needed
    ];
    
    console.log('Starting accessibility tests...');
    
    // Run tests
    const results = await tester.testMultipleUrls(urls);
    
    // Generate and save reports
    const report = tester.generateReport(results);
    
    // Save JSON report
    await tester.saveReport(report, 'json', 'accessibility-report.json');
    
    // Save HTML report
    await tester.saveReport(report, 'html', 'accessibility-report.html');
    
    // Log summary
    console.log('\n=== Accessibility Test Summary ===');
    console.log(`Pages tested: ${report.summary.totalPages}`);
    console.log(`Total violations: ${report.summary.totalViolations}`);
    console.log(`Compliance score: ${report.summary.complianceScore}%`);
    console.log(`Reports saved: accessibility-report.json, accessibility-report.html`);
    
    // Exit with appropriate code
    process.exit(report.summary.totalViolations > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('Accessibility testing failed:', error);
    process.exit(1);
  } finally {
    await tester.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  runAccessibilityTests();
}

module.exports = AccessibilityTester; 