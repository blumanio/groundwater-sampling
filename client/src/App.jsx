import React from 'react';
import Login from './components/Login';
import MainApp from './MainApp'; // Import the new MainApp component

function App() {
    const token = localStorage.getItem('token');

    // If there is no login token, show the Login page
    if (token) {
        return <Login />;
    }

    // If a token exists, show the main application
    return <MainApp />;
}

export default App;