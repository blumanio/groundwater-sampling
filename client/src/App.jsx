import React from 'react';
import MainApp from './MainApp'; // Import the new MainApp component
import Login from './components/Login';
function App() {
    const token = localStorage.getItem('token');

    if (!token) {
        return <Login />;
    }

    // If a token exists, show the main application
    return <MainApp />;
}

export default App;