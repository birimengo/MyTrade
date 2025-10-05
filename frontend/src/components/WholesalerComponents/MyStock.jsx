import React, { Component } from 'react';
import ManualStock from './ManualStock';
import SystemStock from './SystemStock';
import { FaBox, FaDatabase } from 'react-icons/fa';

class MyStock extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeTab: 'manual' // 'manual' or 'system'
    };
  }

  handleTabChange = (tab) => {
    this.setState({ activeTab: tab });
  };

  render() {
    const { activeTab } = this.state;

    return (
      <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900 "> {/* Changed min-h-screen to h-full */}
        {/* Sticky Outer Header */}
        <div className="sticky top-0 z-40 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-4">
            <div className="flex justify-between items-center py-2">
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Stock Management
                </h1>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  {activeTab === 'manual'
                    ? 'Manage inventory manually'
                    : 'AI-powered stock predictions'}
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-4">
                <button
                  onClick={() => this.handleTabChange('manual')}
                  className={`py-2 px-1 border-b-2 text-xs font-medium flex items-center ${
                    activeTab === 'manual'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <FaBox className="mr-1 text-sm" />
                  Manual
                </button>
                <button
                  onClick={() => this.handleTabChange('system')}
                  className={`py-2 px-1 border-b-2 text-xs font-medium flex items-center ${
                    activeTab === 'system'
                      ? 'border-green-500 text-green-600 dark:text-green-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <FaDatabase className="mr-1 text-sm" />
                  System
                </button>
              </nav>
            </div>
          </div>
        </div>

        {/* Content Area - Fixed height with scrolling */}
        <div className="flex-1 overflow-hidden"> {/* Changed from overflow-auto to overflow-hidden */}
          {activeTab === 'manual' ? <ManualStock /> : <SystemStock />}
        </div>
      </div>
    );
  }
}

export default MyStock;