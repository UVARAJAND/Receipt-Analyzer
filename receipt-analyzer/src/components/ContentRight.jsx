// ContentRight.js
import React, { useContext } from 'react';
import '../App.css';
import Charts from './Charts';
import Search from './Search';
import { AppContext } from './AppContext'; // adjust path if needed

function ContentRight() {
  const { viewMode } = useContext(AppContext);

  return (
    <div className='contentRight'>
      {viewMode === 'search' ? <Search /> : <Charts />}
    </div>
  );
}

export default ContentRight;
