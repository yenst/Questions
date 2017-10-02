# Questions
## Logboek
https://docs.google.com/document/d/1nlz7kae_KaoP3mh-Qdn8FsOXiRVNB7x3XZimT1teLKE/edit?usp=sharing

Setup Guide
-----------
1. install MongoDB and NodeJS
2. run mongod.exe then run mongo.exe and run following commands in mongo.exe:
	use questionsDB
	db.thread
	db.thread.createIndex({"question":1},{unique:true})
3. you can exit mongo.exe
4. install all needed NodeJS packages
5. run following command in the directory where app.js is:
	node app.js
6. surf to localhost:8080
