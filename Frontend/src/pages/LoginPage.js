import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import optischedLogo from '../assets/OptiSchedLogo.png';
import gcLogo from '../assets/GClogo.png';
import backgroundImage from '../assets/background-leaf.png';
import '../styles/LoginPage.css';


const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  
  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      console.log(`Attempting to login with API URL: ${API_URL}/auth/login`);
      
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (!response.ok) {
        const errData = await response.json();
        if (errData.detail && errData.detail.toLowerCase().includes("invalid credentials")) {
          throw new Error("Incorrect email or password. Please try again.");
        } else {
          throw new Error(errData.detail || "Login failed. Please try again.");
        }
      }
  
      const data = await response.json();
      localStorage.setItem('accessToken', data.access_token);
      navigate('/create-schedule');
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Left Column: OptiSched Logo & Scattered Floating Squares */}
      <div className="left-container">
        <img 
          src={optischedLogo} 
          alt="OptiSched Logo" 
          className="optisched-logo" 
        />
        <div className="floating-squares">
          <div className="square square1"></div>
          <div className="square square2"></div>
          <div className="square square3"></div>
          <div className="square square4"></div>
          <div className="square square5"></div>
          <div className="square square6"></div>
          <div className="square square7"></div>
          {/* Added new squares */}
          <div className="square square8"></div>
          <div className="square square9"></div>
          <div className="square square10"></div>
          <div className="square square11"></div>
          <div className="square square12"></div>
        </div>
      </div>

      {/* Right Column: Login Section with Background Image */}
      <div 
        className="right-container" 
        style={{ 
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="login-section">
          <img 
            src={gcLogo} 
            alt="GC Logo" 
            className="gc-logo" 
          />
          <div className="login-card">
            <h1>ADMIN LOGIN</h1>
            {error && <p className="message error">{error}</p>}
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <input 
                  type="email" 
                  placeholder="Email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
              <div className="form-group password-group">
                <input 
                  type={passwordVisible ? 'text' : 'password'} 
                  placeholder="Password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
                <span 
                  className="password-toggle" 
                  onClick={togglePasswordVisibility}
                >
                  {passwordVisible ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? 'Logging in...' : 'Log in'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Logging in...</p>
        </div>
      )}
    </div>
  );
};

export default LoginPage;