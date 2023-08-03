import dotenv from "dotenv";
dotenv.config();
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import ejs from "ejs";
import encrypt from "mongoose-encryption";


const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

main().catch(err => console.log(err));

async function main() {
    await mongoose.connect('mongodb://127.0.0.1:27017/userDB');

    const userSchema = new mongoose.Schema({
        email: String,
        password: String
    });


    userSchema.plugin(encrypt, { secret: process.env.SECRET_KEY, encryptedFields: ['password'] });

    const User = new mongoose.model('User', userSchema);

    app.get("/", (req, res) => {
        res.render("home");
    });

    app.get("/login", (req, res) => {
        res.render("login");
    });

    app.get("/register", (req, res) => {
        res.render("register");
    });

    app.post("/register", async (req, res) => {
        try {
            const usr = new User({
                email: req.body.username,
                password: req.body.password
            });

            await usr.save();
            res.render("secrets")
        } catch (error) {
            console.log(error);
        }
    });

    app.post("/login", async (req, res) => {
        try {
            const usrName = req.body.username;
            const password = req.body.password;
            
            const foundUser = await User.findOne({email: usrName})

            if(!foundUser){
                console.log("User not found. Enter correct e-mail");
            } else {
                if(foundUser.password === password){
                    res.render("secrets");
                }
            }
        } catch (error) {
            console.log(error);
        }
    });

    app.listen(3000, () => {
        console.log("Server started at port 3000");
    });
}