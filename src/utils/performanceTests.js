import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

/**
 * Performance Testing Utilities using Lighthouse
 * Provides automated performance auditing capabilities
 */
class PerformanceTests {
  constructor() {
    this.chrome = null;
    this.results = null;
  }

  /**
   * Run Lighthouse audit on the specified URL
   * @param {string} url - URL to audit
   * @param {object} options - Lighthouse options
   * @returns {Promise<object>} Lighthouse results
   */
  async runAudit(url = 'http://localhost:3000', options = {}) {
    const defaultOptions = {
      logLevel: 'info',
      output: 'json',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      port: 0,
      ...options
    };

    try {
      // Launch Chrome
      this.chrome = await chromeLauncher.launch({
        chromeFlags: ['--headless', '--no-sandbox', '--disable-dev-shm-usage']
      });

      // Set the port
      defaultOptions.port = this.chrome.port;

      // Run Lighthouse audit
      const runnerResult = await lighthouse(url, defaultOptions);
      this.results = runnerResult.lhr;

      return this.results;
    } catch (error) {
      console.error('Lighthouse audit failed:', error);
      throw new Error(`Performance audit failed: ${error.message}`);
    } finally {
      if (this.chrome) {
        await this.chrome.kill();
      }
    }
  }

  /**
   * Extract Core Web Vitals from Lighthouse results
   * @param {object} results - Lighthouse results
   * @returns {object} Core Web Vitals metrics
   */
  getCoreWebVitals(results = this.results) {
    if (!results || !results.audits) {
      throw new Error('No Lighthouse results available');
    }

    const audits = results.audits;

    return {
      // First Contentful Paint
      fcp: {
        value: audits['first-contentful-paint']?.numericValue || 0,
        score: audits['first-contentful-paint']?.score || 0,
        displayValue: audits['first-contentful-paint']?.displayValue || 'N/A'
      },
      // Largest Contentful Paint
      lcp: {
        value: audits['largest-contentful-paint']?.numericValue || 0,
        score: audits['largest-contentful-paint']?.score || 0,
        displayValue: audits['largest-contentful-paint']?.displayValue || 'N/A'
      },
      // Cumulative Layout Shift
      cls: {
        value: audits['cumulative-layout-shift']?.numericValue || 0,
        score: audits['cumulative-layout-shift']?.score || 0,
        displayValue: audits['cumulative-layout-shift']?.displayValue || 'N/A'
      },
      // Total Blocking Time
      tbt: {
        value: audits['total-blocking-time']?.numericValue || 0,
        score: audits['total-blocking-time']?.score || 0,
        displayValue: audits['total-blocking-time']?.displayValue || 'N/A'
      },
      // Speed Index
      speedIndex: {
        value: audits['speed-index']?.numericValue || 0,
        score: audits['speed-index']?.score || 0,
        displayValue: audits['speed-index']?.displayValue || 'N/A'
      }
    };
  }

  /**
   * Get performance score and grade
   * @param {object} results - Lighthouse results
   * @returns {object} Performance score and grade
   */
  getPerformanceScore(results = this.results) {
    if (!results || !results.categories) {
      throw new Error('No Lighthouse results available');
    }

    const performanceScore = Math.round((results.categories.performance?.score || 0) * 100);
    
    let grade;
    if (performanceScore >= 90) grade = 'A';
    else if (performanceScore >= 75) grade = 'B';
    else if (performanceScore >= 60) grade = 'C';
    else if (performanceScore >= 45) grade = 'D';
    else grade = 'F';

    return {
      score: performanceScore,
      grade,
      category: results.categories.performance
    };
  }

  /**
   * Get accessibility score and violations
   * @param {object} results - Lighthouse results
   * @returns {object} Accessibility metrics
   */
  getAccessibilityMetrics(results = this.results) {
    if (!results || !results.categories) {
      throw new Error('No Lighthouse results available');
    }

    const accessibilityScore = Math.round((results.categories.accessibility?.score || 0) * 100);
    const audits = results.audits;

    // Get accessibility violations
    const violations = Object.keys(audits)
      .filter(key => {
        const audit = audits[key];
        return audit.id && 
               audit.id.includes('color-contrast') || 
               audit.id.includes('image-alt') ||
               audit.id.includes('label') ||
               audit.id.includes('aria') ||
               audit.id.includes('heading-order') ||
               audit.id.includes('link-name') ||
               audit.id.includes('button-name');
      })
      .map(key => {
        const audit = audits[key];
        return {
          id: audit.id,
          title: audit.title,
          description: audit.description,
          score: audit.score,
          displayValue: audit.displayValue,
          details: audit.details
        };
      })
      .filter(audit => audit.score !== null && audit.score < 1);

    return {
      score: accessibilityScore,
      violations,
      totalViolations: violations.length
    };
  }

  /**
   * Get performance opportunities and diagnostics
   * @param {object} results - Lighthouse results
   * @returns {object} Performance opportunities
   */
  getPerformanceOpportunities(results = this.results) {
    if (!results || !results.audits) {
      throw new Error('No Lighthouse results available');
    }

    const audits = results.audits;
    const opportunities = [];
    const diagnostics = [];

    // Performance opportunities (savings potential)
    const opportunityAudits = [
      'unused-javascript',
      'unused-css-rules',
      'unminified-javascript',
      'unminified-css',
      'render-blocking-resources',
      'optimize-images',
      'modern-image-formats',
      'uses-responsive-images',
      'efficient-animated-content',
      'uses-webp-images'
    ];

    opportunityAudits.forEach(auditId => {
      const audit = audits[auditId];
      if (audit && audit.details && audit.details.overallSavingsMs > 0) {
        opportunities.push({
          id: auditId,
          title: audit.title,
          description: audit.description,
          score: audit.score,
          savingsMs: audit.details.overallSavingsMs,
          savingsBytes: audit.details.overallSavingsBytes || 0,
          displayValue: audit.displayValue
        });
      }
    });

    // Performance diagnostics
    const diagnosticAudits = [
      'dom-size',
      'critical-request-chains',
      'server-response-time',
      'mainthread-work-breakdown',
      'bootup-time',
      'uses-long-cache-ttl',
      'total-byte-weight'
    ];

    diagnosticAudits.forEach(auditId => {
      const audit = audits[auditId];
      if (audit && audit.score !== null && audit.score < 1) {
        diagnostics.push({
          id: auditId,
          title: audit.title,
          description: audit.description,
          score: audit.score,
          displayValue: audit.displayValue,
          details: audit.details
        });
      }
    });

    return {
      opportunities: opportunities.sort((a, b) => b.savingsMs - a.savingsMs),
      diagnostics
    };
  }

  /**
   * Generate a comprehensive performance report
   * @param {string} url - URL to audit
   * @returns {Promise<object>} Comprehensive performance report
   */
  async generateReport(url = 'http://localhost:3000') {
    try {
      const results = await this.runAudit(url);
      
      return {
        url,
        timestamp: new Date().toISOString(),
        performance: this.getPerformanceScore(results),
        coreWebVitals: this.getCoreWebVitals(results),
        accessibility: this.getAccessibilityMetrics(results),
        opportunities: this.getPerformanceOpportunities(results),
        rawResults: results
      };
    } catch (error) {
      console.error('Failed to generate performance report:', error);
      throw error;
    }
  }

  /**
   * Run performance audit on multiple pages
   * @param {Array<string>} urls - URLs to audit
   * @returns {Promise<Array<object>>} Performance reports for all URLs
   */
  async auditMultiplePages(urls = ['http://localhost:3000']) {
    const reports = [];

    for (const url of urls) {
      try {
        console.log(`Auditing ${url}...`);
        const report = await this.generateReport(url);
        reports.push(report);
        
        // Small delay between audits to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to audit ${url}:`, error);
        reports.push({
          url,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    return reports;
  }

  /**
   * Compare performance between two audits
   * @param {object} baseline - Baseline audit results
   * @param {object} current - Current audit results
   * @returns {object} Performance comparison
   */
  comparePerformance(baseline, current) {
    if (!baseline || !current) {
      throw new Error('Both baseline and current results are required for comparison');
    }

    const baselineVitals = baseline.coreWebVitals;
    const currentVitals = current.coreWebVitals;

    const comparison = {
      performance: {
        baseline: baseline.performance.score,
        current: current.performance.score,
        change: current.performance.score - baseline.performance.score
      },
      vitals: {}
    };

    // Compare each Core Web Vital
    Object.keys(baselineVitals).forEach(metric => {
      const baselineValue = baselineVitals[metric].value;
      const currentValue = currentVitals[metric].value;
      const change = currentValue - baselineValue;
      const percentChange = baselineValue > 0 ? (change / baselineValue) * 100 : 0;

      comparison.vitals[metric] = {
        baseline: baselineValue,
        current: currentValue,
        change,
        percentChange: Math.round(percentChange * 100) / 100,
        improved: change < 0 // Lower is better for most metrics
      };
    });

    return comparison;
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    if (this.chrome) {
      await this.chrome.kill();
      this.chrome = null;
    }
  }
}

export default PerformanceTests; 