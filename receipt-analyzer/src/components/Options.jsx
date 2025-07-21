import React, { useContext } from 'react';
import '../App.css';
import { AppContext } from './AppContext'; 

function Options() {
  const { viewMode, setViewMode } = useContext(AppContext);

  return (
    <div className='Options'>
<button
  className={`option-btn ${viewMode === 'search' ? 'active' : ''}`}
  onClick={() => setViewMode('search')}
>
  Search
</button>
<button
  className={`option-btn ${viewMode === 'visualization' ? 'active' : ''}`}
  onClick={() => setViewMode('visualization')}
>
  Visualization
</button>

    </div>
  );
}

export default Options;
