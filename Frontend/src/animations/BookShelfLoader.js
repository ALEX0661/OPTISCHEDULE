import React from 'react';
import './BookShelfLoader.css';

const BookShelfLoader = () => (
  <div className="bookshelf-wrapper">
    <div className="bookshelf-loader">
      <div className="book" style={{ '--delay': '0s' }}></div>
      <div className="book" style={{ '--delay': '0.1s' }}></div>
      <div className="book" style={{ '--delay': '0.2s' }}></div>
      <div className="book" style={{ '--delay': '0.3s' }}></div>
    </div>
    <div className="loading-text">Loading Courses...</div>
  </div>
);

export default BookShelfLoader;
