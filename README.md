# Questions_Remake
Ask and answer questions live, like Stack Overflow.

# How to run
1. Start mongod
2. npm start

## Change based on environment public/js/socketModule.js
- SERVER: const socket = io('http://questions.dev:3000/questions-live');
- Localhost: const socket = io('http://localhost:3000/questions-live');
