import React from 'react';
import ReactDOM from 'react-dom/client';
import './css/index.css';
import App from './App';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import TemperatureVisual from './pages/TemperatureVisual';
import FlowVisual from './pages/FlowVisual';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
      <BrowserRouter basename="/lake-visuals">
        <Routes>
            <Route path='/' element={<App/>}></Route>
            <Route path='/temperature' element={<TemperatureVisual/>}></Route>
            <Route path='/flow' element={<FlowVisual/>}></Route>
        </Routes>
      </BrowserRouter>
  </React.StrictMode>
);

