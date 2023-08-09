import dotenv from "dotenv";
dotenv.config();
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import ejs from "ejs";
import session from "express-session";
import passport from "passport";
import passportLocalMongoose from "passport-local-mongoose";
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import findOrCreate from "mongoose-findorcreate";

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

main().catch(err => console.log(err));

//Manage User Sessions
app.use(session({           
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize()); //Initialize passport
app.use(passport.session());    //Use passport to deal with sessions

async function main() {
    await mongoose.connect('mongodb://127.0.0.1:27017/userDB');

    const userSchema = new mongoose.Schema({
        email: String,
        password: String,
        googleId: String
    });

    //plugin passportLocalMongoose for facilitate hash and salting
    userSchema.plugin(passportLocalMongoose, { usernameField: "email"});

    //For using findOrCreate method on model
    userSchema.plugin(findOrCreate);

    const User = new mongoose.model('User', userSchema);

    //Create Local Strategy to authenticate with email and password entered in form
    passport.use(User.createStrategy());

    passport.serializeUser(function(user, done) {
        done(null, user);
    });
    
    passport.deserializeUser(function(user, done) {
        done(null, user);
    });

    //Create Google Strategy for authentication through passport
    passport.use(new GoogleStrategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/secrets"
      }, (accessToken, refreshToken, profile, cb) => {
        console.log(profile);

        User.findOrCreate({ googleId: profile.id }, (err, user) => {
          return cb(err, user);
        });
      }
    ));
    
    app.get("/", (req, res) => {
        res.render("home");
    });

    app.get("/auth/google",
        passport.authenticate("google", { scope: [ "profile" ] })
    );

    app.get("/auth/google/secrets", passport.authenticate("google", 
        { failureRedirect: "/login" }), (req, res) => {
        console.log("This is the secrets route Authentication");
        res.redirect("/secrets");
    });

    app.get("/login", (req, res) => {
        res.render("login");
    });

    app.get("/register", (req, res) => {
        res.render("register");
    });

    app.get("/secrets", (req, res) => {
        if (req.isAuthenticated()){
            res.render("secrets");
        } else {
            res.redirect("/login");
        }
    });

    app.post("/logout", async (req,res) => {
        req.logout((err) => {
            if (err) {
                console.error(err);
                res.status(500).send("Logout failed");
            } else {
                res.redirect("/");
            }
        });
    });

    app.post("/register", async (req, res) => {
        try {
            await User.register({ email: req.body.email }, req.body.password);
            const authenticate = await passport.authenticate("local");
            authenticate(req, res, () => {
                res.redirect("/secrets");
            });
        } catch (error) {
            console.log('Error:' + error);
            res.redirect("/register");
        }
    });

    app.post("/login", passport.authenticate("local", {
        successRedirect: "/secrets",
        failureRedirect: "/login"
    }));

    app.listen(3000, () => {
        console.log("Server started at port 3000");
    });
}