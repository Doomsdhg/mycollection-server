const { Router } = require('express');
const router = Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const {check, validationResult} = require('express-validator');
const jwt = require('jsonwebtoken');
const config = require('config');
const cloudinaryName = config.get('cloudinaryName');
const cloudinaryApiKey = config.get('cloudinaryApiKey');
const cloudinarySecret = config.get('cloudinarySecret');

router.post(
    '/register', 
    [
        check('email', 'email is invalid').isEmail()
    ],
    async (request, response) => {

        try {
            
            const errors = validationResult(request);
            if (!errors.isEmpty()) {
                const arr = (errors.array().map((e)=>{return e.msg}));
                return response.status(400).json({
                    message: arr.join(';')
                });
            }
            const {email, password} = request.body;
            const candidate = await User.findOne({ email: email});
            if (candidate) {
                return response.status(400).json({message: 'This email is already registered'})
            }
            const hashedPass = await bcrypt.hash(password, 10);
            const user = new User({ email, password: hashedPass});
            await user.save();
            response.status(201).json({message: 'Account is created successfully'});

        } catch(e){
            response.status(500).json({message: `Error: ${e}`})
        }
    })

router.post(
    '/authentication', 
    [
        check('email', 'Email is invalid').normalizeEmail().isEmail(),
        check('password', 'Enter password').exists()
    ],
    async (request, response) => {
        try {
            const errors = validationResult(request);
            if (!errors.isEmpty()) {
                const arr = (errors.array().map((e)=>{return e.msg}));
                return response.status(400).json({
                    message: arr.join(';')
                });
            }
            const {email, password} = request.body;
            const user = await User.findOne({email});
            console.log(user);
            if (!user) {
                console.log('doesnt exist');
                return response.status(400).json({message: 'Couldnt find user with such email'})
            }
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                console.log('pass');
                return response.status(400).json({ message: 'password is incorrect'})
            }
            const token = jwt.sign(
                {userId: user.id},
                config.get('jwtSecret'),
                {expiresIn: '1h'}
            )
            response.json({token, userId: user.id})
        } catch(e){
            console.log(e);
            response.status(500).json({message: `Error: ${e}`})
        }
    })

router.post(
    '/uploadimage',
    async (request, response) => {
        try {
            const fileString = req.body.data;
            const uploadedResponse = await cloudinary.uploader.upload(fileStr, {
                uploadPreset: 'dev_setups'
            })
            console.log(uploadedResponse);
            response.json({msg: "success"})
        } catch (error) {
            console.log(error);
            res.status(500).json({msg: "something went wrong"})
        }
        
    }
)

router.get(
    '/api/images',
    async (request, response) => {
        const {resources} = cloudinary.search.expression('folder:dev_setups')
        .sort_by('public_id', 'desc')
        .max_results(30)
        .execute();
        const publicIds = resources.map( file => file.public_id);
        response.send(publicIds);
    }
)

module.exports = router