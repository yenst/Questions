/**
 * Load module dependencies.
 */
const http = require('http');
const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require("express-session");
const MongoStore = require('connect-mongo')(session);
const mongoose = require("mongoose");
mongoose.Promise = global.Promise; //Solution for Mongoose Promise is deprecated
const GoogleStrategy = require('passport-google-oauth2').Strategy;
const passport = require('passport');

/**
 * Load dev dependencies
 * TODO Setup different running modes.
 * More info: https://www.hacksparrow.com/running-express-js-in-production-mode.html
 * https://stackoverflow.com/questions/10714315/node-js-express-and-using-development-versus-production-in-app-configure
 * https://www.npmjs.com/package/config
 */

/**
 * Load environment variables
 * TODO Look for a better solution for .env files and variables
 */
require('dotenv').config();

/**
 * Load models
 */
const User = require("./models/user");

/**
 * Connect to MongoDB with mongoose
 */
mongoose.connect(process.env.MONGODB_URL, {useMongoClient: true}).catch(err => {
    console.error(err);
});

/**
 * Make instances and start server
 */
const app = express();
const httpServer = http.createServer(app);
const port = process.env.PORT || 3000;
httpServer.listen(port, function () {
    console.log(`Server running on port ${port}`);
});
const sessionStore = new MongoStore({mongooseConnection: mongoose.connection});

/**
 * View engine setup.
 */
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

/**
 * Express server middleware
 */
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
// app.use(logger('dev')); //Set wanted logging format, more info @ https://github.com/expressjs/morgan
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(session({
        //TODO Look further into sessions
        store: sessionStore,
        secret: process.env.SESSION_KEY,
        resave: false, //don't save session if unmodified
        saveUninitialized: false, // don't create session until something stored
        unset: 'destroy', //Remove session from sessionStore when user deserializes
    })
);
app.use(passport.initialize());
app.use(passport.session());

/**
 * Setup socket.io
 */
require("./socket-io")(httpServer, sessionStore);

/**
 * Development error handler middleware
 * prints the stacktrace
 */
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            errorMsg: err.message,
            stackTrace: err
        });
    });
}
/**
 * Production error handler middleware
 * no stacktraces leaked to user
 */
else if (app.get('env') === 'production') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            errorMsg: err.message,
            stackTrace: {}
        });
    });
}

/**
 * Serve public folder static
 */
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Setup passport with Google Strategy
 */
passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CLIENT_CALLBACK_URL,
        passReqToCallback: true
    }, function (request, accessToken, refreshToken, profile, done) {
        if (profile._json.domain && profile._json.domain.includes("howest.be")) {
            User.findOneOrCreate({email: profile.email}, {
                displayName: profile.displayName,
                email: profile.email,
                domain: profile._json.domain,
                isAdmin: (profile._json.domain === "student.howest.be"),
                googleId: profile.id
            }, function (err, user) {
                let dataForSession = {
                    uid: user._id,
                    isAdmin: user.isAdmin,
                    credits: user.credits
                };
                done(null, dataForSession);
            });
        } else {
            done(null, null);
        }
    }
));
passport.serializeUser(function (userId, done) {
    done(null, userId);
});
passport.deserializeUser(function (userId, done) {
    done(null, userId);
});


/**
 * Setup routes
 */
app.use('/', require("./routes/main"));
app.use('/api', require("./routes/api"));
app.use("/auth", require("./routes/authenticate"));

/**
 * Any other routes return 404
 */
app.get("*", function (req, res) {
    res.status(404).render("error", {
        title: "404 Not Found",
        error: "Your URL is incorrect."
    });
});