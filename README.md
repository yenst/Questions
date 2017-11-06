# Questions_Remake
Ask and answer questions live, like Stack Overflow.

# How to run
1. Start mongod
2. npm start

## Change based on environment 
### In /public/js/socketModule.js
- SERVER: const socket = io('http://questions.dev:3000/questions-live');
- Localhost: const socket = io('http://localhost:3000/questions-live');

### In hosts file
- Connect to server: 172.21.22.52 	questions.dev	www.questions.dev
- Connect to localhost: 127.0.0.1		questions.dev	www.questions.dev
