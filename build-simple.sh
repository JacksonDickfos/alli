#!/bin/bash

# Create a simple working HTML file
cat > dist/index.html << 'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Alli Nutrition App</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0; 
            padding: 20px; 
            background: #fff;
            text-align: center;
        }
        .container {
            max-width: 400px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        .logo {
            width: 80px;
            height: 80px;
            background: #B9A68D;
            border-radius: 20px;
            margin: 0 auto 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 24px;
            font-weight: bold;
        }
        h1 {
            color: #B9A68D;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #666;
            margin-bottom: 40px;
        }
        .button {
            background: #B9A68D;
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 10px;
            font-size: 16px;
            cursor: pointer;
            margin: 10px;
            display: block;
            width: 100%;
            max-width: 200px;
            margin: 10px auto;
        }
        .button:hover {
            background: #9a8a6d;
        }
        .nav {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: white;
            border-top: 1px solid #eee;
            display: flex;
            justify-content: space-around;
            padding: 10px 0;
        }
        .nav-item {
            text-align: center;
            color: #666;
            text-decoration: none;
            font-size: 12px;
        }
        .nav-item.active {
            color: #B9A68D;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">A</div>
        <h1>Alli Nutrition</h1>
        <p class="subtitle">Your personal nutrition companion</p>
        
        <button class="button" onclick="showLogin()">Login</button>
        <button class="button" onclick="showSignup()">Sign Up</button>
        
        <div id="content" style="display: none;">
            <h2>Welcome to Alli!</h2>
            <p>You are now logged in. This is a working demo for your investor meetings.</p>
            <button class="button" onclick="showNutrition()">Food Photo Analyzer</button>
            <button class="button" onclick="showGoals()">Set Goals</button>
        </div>
    </div>
    
    <div class="nav">
        <a href="#" class="nav-item active" onclick="showHome()">Home</a>
        <a href="#" class="nav-item" onclick="showNutrition()">Nutrition</a>
        <a href="#" class="nav-item" onclick="showAlli()">Alli</a>
        <a href="#" class="nav-item" onclick="showGoals()">Goals</a>
        <a href="#" class="nav-item" onclick="showAccount()">Account</a>
    </div>

    <script>
        function showLogin() {
            alert('Login functionality coming soon! For demo purposes, you are now logged in.');
            document.getElementById('content').style.display = 'block';
        }
        
        function showSignup() {
            alert('Sign up functionality coming soon! For demo purposes, you are now logged in.');
            document.getElementById('content').style.display = 'block';
        }
        
        function showHome() {
            alert('Home screen - Welcome to Alli Nutrition!');
        }
        
        function showNutrition() {
            alert('Nutrition screen - Food Photo Analyzer coming soon!');
        }
        
        function showAlli() {
            alert('Alli AI Chatbot - Coming soon!');
        }
        
        function showGoals() {
            alert('Goals screen - Set your nutrition goals!');
        }
        
        function showAccount() {
            alert('Account screen - Manage your profile!');
        }
    </script>
</body>
</html>
HTML

echo "Simple working app created!"
