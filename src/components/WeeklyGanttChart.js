import React, { useState } from 'react';

const ThesisGanttChart = () => {
  // State for the tooltip/hover details and position
  const [hoveredGateway, setHoveredGateway] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  // Project timeframe: June 1 - September 1, 2024
  // Calculate weeks in the project (June, July, August)
  const weeks = [
    { name: "JUN 1-7", days: ["S", "M", "T", "W", "T", "F", "S"] },
    { name: "JUN 8-14", days: ["S", "M", "T", "W", "T", "F", "S"] },
    { name: "JUN 15-21", days: ["S", "M", "T", "W", "T", "F", "S"] },
    { name: "JUN 22-28", days: ["S", "M", "T", "W", "T", "F", "S"] },
    { name: "JUN 29-JUL 5", days: ["S", "M", "T", "W", "T", "F", "S"] },
    { name: "JUL 6-12", days: ["S", "M", "T", "W", "T", "F", "S"] },
    { name: "JUL 13-19", days: ["S", "M", "T", "W", "T", "F", "S"] },
    { name: "JUL 20-26", days: ["S", "M", "T", "W", "T", "F", "S"] },
    { name: "JUL 27-AUG 2", days: ["S", "M", "T", "W", "T", "F", "S"] },
    { name: "AUG 3-9", days: ["S", "M", "T", "W", "T", "F", "S"] },
    { name: "AUG 10-16", days: ["S", "M", "T", "W", "T", "F", "S"] },
    { name: "AUG 17-23", days: ["S", "M", "T", "W", "T", "F", "S"] },
    { name: "AUG 24-30", days: ["S", "M", "T", "W", "T", "F", "S"] },
    { name: "AUG 31-SEP 1", days: ["S", "M", "-", "-", "-", "-", "-"] },
  ];

  // Task structure with timing in weeks
  const tasks = [
    {
      id: 1,
      name: "PLANNING",
      activities: [
        { 
          id: 1.1, 
          name: "Confirm topic & objectives", 
          weeks: [0], 
          days: [1, 2, 3], 
          owner: "ME",
          color: "bg-blue-400",
          isGateway: false
        },
        { 
          id: 1.2, 
          name: "Write research proposal", 
          weeks: [0, 1], 
          days: [4, 5, 6, 0, 1], 
          owner: "ME",
          color: "bg-blue-400",
          isGateway: true,
          gatewayInfo: {
            name: "Research Proposal Approved",
            deliverables: ["Approved research topic", "Research objectives defined", "Initial literature survey", "Methodology outline"],
            nextSteps: "Proceed to detailed research and prototype development"
          }
        }
      ]
    },
    {
      id: 2,
      name: "PROTOTYPE DEVELOPMENT",
      activities: [
        { 
          id: 2.1, 
          name: "Requirements gathering", 
          weeks: [0, 1], 
          days: [1, 2, 3, 4, 5, 6, 0], 
          owner: "ME",
          color: "bg-purple-400",
          isGateway: false
        },
        { 
          id: 2.2, 
          name: "Design phase", 
          weeks: [1, 2], 
          days: [1, 2, 3, 4, 5, 6, 0, 1, 2, 3], 
          owner: "ME",
          color: "bg-purple-400", 
          isGateway: false
        },
        { 
          id: 2.3, 
          name: "Test development (TDD)", 
          weeks: [2, 3], 
          days: [4, 5, 6, 0, 1, 2, 3], 
          owner: "ME",
          color: "bg-purple-400", 
          isGateway: false
        },
        { 
          id: 2.4, 
          name: "Implementation (Agile sprints)", 
          weeks: [3, 4, 5, 6], 
          days: [4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 3], 
          owner: "ME",
          color: "bg-purple-400", 
          isGateway: false
        },
        { 
          id: 2.5, 
          name: "DevOps implementation", 
          weeks: [6, 7, 8], 
          days: [4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 0], 
          owner: "ME",
          color: "bg-indigo-400", 
          isGateway: false
        },
        { 
          id: 2.6, 
          name: "Test and debug prototype", 
          weeks: [8, 9, 10], 
          days: [1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 0], 
          owner: "ME",
          color: "bg-indigo-400", 
          isGateway: true,
          gatewayInfo: {
            name: "Functional Prototype Complete",
            deliverables: ["Working AI-powered CSV to CSA transition tool", "Test documentation", "Performance metrics", "Comparison with traditional methods"],
            nextSteps: "Begin evaluation and data analysis phase"
          }
        }
      ]
    },
    {
      id: 3,
      name: "RESEARCH & WRITING",
      activities: [
        { 
          id: 3.1, 
          name: "Background reading/literature review", 
          weeks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], 
          days: [1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 0], // Ongoing throughout project
          owner: "ME",
          color: "bg-green-300", 
          isGateway: false
        },
        { 
          id: 3.2, 
          name: "Write Chapter 1: Introduction", 
          weeks: [1, 2], 
          days: [0, 1, 2, 3, 4, 5, 6, 0], 
          owner: "ME",
          color: "bg-pink-400", 
          isGateway: false
        },
        { 
          id: 3.3, 
          name: "Write Chapter 2: Literature Review", 
          weeks: [2, 3, 4], 
          days: [1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 0], 
          owner: "ME",
          color: "bg-pink-400", 
          isGateway: false
        },
        { 
          id: 3.4, 
          name: "Write Chapter 3: Methodology", 
          weeks: [4, 5], 
          days: [1, 2, 3, 4, 5, 6, 0, 1, 2, 3], 
          owner: "ME",
          color: "bg-pink-400", 
          isGateway: false
        },
        { 
          id: 3.5, 
          name: "Conduct surveys (LinkedIn/email)", 
          weeks: [5, 6, 7, 8], 
          days: [4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 3], 
          owner: "ME",
          color: "bg-green-400", 
          isGateway: true,
          gatewayInfo: {
            name: "Survey Data Collection Complete",
            deliverables: ["Expert feedback on CSV to CSA transition", "Industry professional perspectives", "Market validation of AI approach", "Data for quantitative analysis"],
            nextSteps: "Analyze data and incorporate findings into thesis"
          }
        },
        { 
          id: 3.6, 
          name: "Write Chapter 4: Findings & Analysis", 
          weeks: [8, 9, 10], 
          days: [4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4], 
          owner: "ME",
          color: "bg-pink-400", 
          isGateway: false
        }
      ]
    },
    {
      id: 4,
      name: "EVALUATION & FINALIZATION",
      activities: [
        { 
          id: 4.1, 
          name: "Mid-project supervisor review", 
          weeks: [6], 
          days: [3, 4, 5], 
          owner: "SV",
          color: "bg-red-400", 
          isGateway: true,
          gatewayInfo: {
            name: "Mid-Project Supervisor Review",
            deliverables: ["Progress report", "Initial findings", "Prototype development status", "Timeline adherence assessment"],
            nextSteps: "Address feedback and continue with implementation"
          }
        },
        { 
          id: 4.2, 
          name: "SME evaluation of reports", 
          weeks: [10, 11], 
          days: [1, 2, 3, 4, 5, 6, 0], 
          owner: "SME",
          color: "bg-purple-300", 
          isGateway: true,
          gatewayInfo: {
            name: "Subject Matter Expert Evaluation",
            deliverables: ["Expert validation of AI approach", "Industry relevance assessment", "Technical accuracy confirmation", "Implementation recommendations"],
            nextSteps: "Incorporate expert feedback into final chapters"
          }
        },
        { 
          id: 4.3, 
          name: "Write Chapter 5: Conclusions", 
          weeks: [11, 12], 
          days: [1, 2, 3, 4, 5, 6, 0], 
          owner: "ME",
          color: "bg-pink-400", 
          isGateway: false
        },
        { 
          id: 4.4, 
          name: "Compile references & appendices", 
          weeks: [12], 
          days: [1, 2, 3], 
          owner: "ME",
          color: "bg-blue-300", 
          isGateway: false
        },
        { 
          id: 4.5, 
          name: "Write abstract", 
          weeks: [12], 
          days: [4, 5], 
          owner: "ME",
          color: "bg-blue-300", 
          isGateway: false
        },
        { 
          id: 4.6, 
          name: "Final review and submission", 
          weeks: [12, 13], 
          days: [6, 0, 1], 
          owner: "ME",
          color: "bg-blue-300", 
          isGateway: true,
          gatewayInfo: {
            name: "Thesis Submission Complete",
            deliverables: ["Complete thesis document", "Functional AI prototype", "All appendices and references", "Executive summary"],
            nextSteps: "Prepare for viva and demonstration"
          }
        },
        { 
          id: 4.7, 
          name: "Viva preparation", 
          weeks: [13], 
          days: [0, 1], 
          owner: "ME",
          color: "bg-blue-300", 
          isGateway: false
        }
      ]
    }
  ];

  // Owner information
  const owners = {
    "ME": "You (Thesis Author)",
    "SV": "Supervisor",
    "SME": "Subject Matter Expert"
  };

  // Render a cell for a particular week and day
  const renderCell = (weekIndex, dayIndex, activity) => {
    // Check if this activity spans this particular day in this particular week
    const isActiveDay = activity.weeks.includes(weekIndex) && 
                        ((weekIndex === activity.weeks[0] && dayIndex >= activity.days[0]) ||
                         (weekIndex > activity.weeks[0] && weekIndex < activity.weeks[activity.weeks.length-1]) ||
                         (weekIndex === activity.weeks[activity.weeks.length-1] && dayIndex <= activity.days[activity.days.length-1]));
    
    // Handle first or last day of an activity
    const isFirstDay = weekIndex === activity.weeks[0] && dayIndex === activity.days[0];
    const isLastDay = weekIndex === activity.weeks[activity.weeks.length-1] && dayIndex === activity.days[activity.days.length-1];
    
    // Check if this is a gateway (last cell of a gateway activity)
    const isGatewayCell = activity.isGateway && isLastDay;
    
    // Determine the cell color
    let cellColor = isActiveDay ? activity.color : 'bg-white';
    if (isGatewayCell) {
      cellColor = 'bg-amber-500'; // Gateway color
    }
    
    // Handler functions for mouse events
    const handleMouseEnter = (e) => {
      if (isGatewayCell) {
        const rect = e.currentTarget.getBoundingClientRect();
        const centerX = window.pageXOffset + rect.left + rect.width/2;
        const bottomY = window.pageYOffset + rect.bottom;
        
        setTooltipPosition({ x: centerX, y: bottomY });
        setHoveredGateway(activity.gatewayInfo);
      }
    };
    
    const handleMouseLeave = () => {
      if (isGatewayCell) {
        setHoveredGateway(null);
      }
    };
    
    return (
      <td 
        key={`${weekIndex}-${dayIndex}-${activity.id}`} 
        className={`border border-gray-200 w-6 h-6 
          ${cellColor} 
          ${isFirstDay ? 'rounded-l' : ''} 
          ${isLastDay ? 'rounded-r' : ''}`
        }
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      ></td>
    );
  };

  return (
    <div className="p-2 bg-white rounded-lg shadow-lg overflow-x-auto relative">
      <h1 className="text-2xl font-bold mb-4">AI-Enabled CSV to CSA Transition: Thesis GANTT Chart</h1>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Project Timeline: June 1 - September 1, 2024</h2>
      </div>
      
      <div className="mb-6">
        <h3 className="text-md font-semibold mb-2">Research Objectives:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <div className="bg-gray-100 p-2 rounded">1. Analyze existing CSV practices</div>
          <div className="bg-gray-100 p-2 rounded">2. Investigate CSA's risk-based approach</div>
          <div className="bg-gray-100 p-2 rounded">3. Conduct gap analysis for CSV to CSA transition</div>
          <div className="bg-gray-100 p-2 rounded">4. Examine AI agent capabilities and limitations</div>
          <div className="bg-gray-100 p-2 rounded">5. Suggest AI applications to bridge CSV-CSA gap</div>
          <div className="bg-gray-100 p-2 rounded">6. Develop and test AI prototype for validation</div>
        </div>
      </div>
      
      <div className="mb-4">
        <h3 className="text-md font-semibold mb-2">Legend:</h3>
        <div className="flex flex-wrap gap-3 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 mr-1 bg-blue-400"></div>
            <span>Planning</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 mr-1 bg-purple-400"></div>
            <span>Development</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 mr-1 bg-indigo-400"></div>
            <span>Testing</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 mr-1 bg-green-300"></div>
            <span>Ongoing Research</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 mr-1 bg-green-400"></div>
            <span>Research Activities</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 mr-1 bg-pink-400"></div>
            <span>Writing</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 mr-1 bg-red-400"></div>
            <span>Review</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 mr-1 bg-blue-300"></div>
            <span>Finalization</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 mr-1 bg-amber-500"></div>
            <span>Gateway</span>
          </div>
        </div>
      </div>
      
      <div className="mb-4">
        <h3 className="text-md font-semibold mb-2">Resources:</h3>
        <div className="flex flex-wrap gap-3 text-sm">
          {Object.entries(owners).map(([key, value]) => (
            <div key={key} className="flex items-center">
              <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center mr-1">
                {key}
              </div>
              <span>{value}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Gateway Hover Tooltip */}
      {hoveredGateway && (
        <div 
          className="absolute bg-white border border-gray-300 shadow-lg rounded-md p-3 z-50 max-w-sm"
          style={{
            left: `${tooltipPosition.x}px`, 
            top: `${tooltipPosition.y}px`,
            transform: 'translate(-50%, 10px)',
            pointerEvents: 'none'
          }}
        >
          <h4 className="font-bold text-lg text-amber-600">{hoveredGateway.name}</h4>
          <h5 className="font-semibold mt-2">Deliverables:</h5>
          <ul className="list-disc pl-5 mt-1">
            {hoveredGateway.deliverables.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
          <h5 className="font-semibold mt-2">Next Steps:</h5>
          <p>{hoveredGateway.nextSteps}</p>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="border-collapse w-full min-w-max">
          <thead>
            <tr>
              <th className="border border-gray-300 bg-gray-100 p-2 w-48 text-left">Tasks & Activities</th>
              {weeks.map((week, weekIndex) => (
                <th key={week.name} colSpan={7} className="border border-gray-300 bg-gray-800 text-white p-1 text-center text-xs">
                  {week.name}
                </th>
              ))}
              <th className="border border-gray-300 bg-gray-100 p-2 w-16 text-center">Owner</th>
            </tr>
            <tr>
              <th className="border border-gray-300 bg-gray-100"></th>
              {weeks.map((week, weekIndex) => (
                week.days.map((day, dayIndex) => (
                  <th key={`${weekIndex}-${day}`} className="border border-gray-300 bg-gray-200 w-6 p-1 text-center text-xs">
                    {day}
                  </th>
                ))
              ))}
              <th className="border border-gray-300 bg-gray-100"></th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <React.Fragment key={task.id}>
                <tr>
                  <td className="border border-gray-300 bg-gray-800 text-white p-2 font-bold">
                    {task.name}
                  </td>
                  {weeks.map((week, weekIndex) => (
                    week.days.map((day, dayIndex) => (
                      <td key={`${weekIndex}-${dayIndex}`} className="border border-gray-300 bg-gray-700"></td>
                    ))
                  ))}
                  <td className="border border-gray-300 bg-gray-800 text-white"></td>
                </tr>
                {task.activities.map((activity) => (
                  <tr key={activity.id}>
                    <td className="border border-gray-300 p-2 text-sm">
                      {activity.name}
                    </td>
                    {weeks.map((week, weekIndex) => (
                      week.days.map((day, dayIndex) => (
                        renderCell(weekIndex, dayIndex, activity)
                      ))
                    ))}
                    <td className="border border-gray-300 p-1 text-center">
                      <div className="w-8 h-8 rounded-full bg-red-100 mx-auto flex items-center justify-center text-sm">
                        {activity.owner}
                      </div>
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-6 p-3 bg-blue-50 rounded border border-blue-200 text-sm">
        <h3 className="font-semibold mb-2">Key Notes:</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Each task includes a 10% time buffer as requested</li>
          <li>Amber colored cells indicate gateways at the end of key tasks (hover to see details)</li>
          <li>Background literature review runs throughout the project</li>
          <li>The prototype development follows Agile/DevOps methodology with TDD</li>
          <li>Mid-project supervisor review scheduled mid-July</li>
          <li>SME evaluation of generated reports scheduled in August</li>
          <li>Sequential dependencies are maintained in the task flow</li>
          <li>The chart visualizes which tasks can be done in parallel</li>
        </ul>
      </div>
    </div>
  );
};

export default ThesisGanttChart;