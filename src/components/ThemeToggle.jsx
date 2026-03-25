import { useId } from 'react';
import { useTheme } from '../context/ThemeContext';
import './ThemeToggle.css';

export default function ThemeToggle() {
  const { isDarkMode, toggleTheme } = useTheme();
  const id = useId();
  const checkboxId = `theme-toggle-${id}`;

  return (
    <div className="theme-switch-wrapper">
      <div className="theme-switch">
        <input
          type="checkbox"
          id={checkboxId}
          className="theme-switch__input"
          checked={isDarkMode}
          onChange={toggleTheme}
        />
        <label
          htmlFor={checkboxId}
          className={`theme-switch__label${isDarkMode ? ' theme-switch__label--dark' : ''}`}
          title={`Switch to ${isDarkMode ? 'Light' : 'Dark'} Mode`}
        >
          <span className="theme-switch__icon theme-switch__icon--sun">☀️</span>
          <span className="theme-switch__icon theme-switch__icon--moon">🌙</span>
        </label>
      </div>
    </div>
  );
}
