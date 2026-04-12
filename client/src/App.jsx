import React from 'react';
import Login from './components/Login';
import MainApp from './MainApp'; // Import the new MainApp component

function App() {
    const token = localStorage.getItem('token');

    if (!token) {
        return <Login />;
    }

    return <MainApp />;
}

export default App;