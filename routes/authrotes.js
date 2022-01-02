const { Router } = require('express');
const router = Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const {check, validationResult} = require('express-validator');
const jwt = require('jsonwebtoken');
const config = require('config');


router.post(
    '/register', 
    [
        check('email', 'email is invalid').isEmail()
    ],
    async (request, response) => {

        try {
            
            const errors = validationResult(request);
            if (!errors.isEmpty()) {

                const res = response.status(400).json({
                    errors: errors.array(),
                    message: 'Error! Invalid data'
                });
                console.log(res);
                return res
            }
            console.log(request.body);
            const {email, password} = request.body;
            console.log(password);
            const candidate = await User.findOne({ email: email});
            console.log('findone is ok ' + candidate);
            if (candidate) {
                return response.status(400).json({message: 'This email is already registered'})
            }
            console.log('candidate is ok');
            console.log(password);
            const hashedPass = await bcrypt.hash(password, 10);
            console.log('hashedpass is ok' + hashedPass);
            const user = new User({ email, password: hashedPass});
            console.log(user);
            await user.save();
            
            console.log(hashedPass);
            response.status(201).json({message: 'Account is created successfully'});

        } catch(e){
            console.log(e);
            response.status(500).json({message: `Error: ${e}`})
        }
    })

router.post(
    '/authetication', 
    [
        check('email', 'Email is invalid').normalizeEmail().isEmail(),
        check('pass', 'Enter password').exists()
    ],
    async (request, response) => {
        try {
            const errors = validationResult(request);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    errors: errors.array(),
                    message: 'Error! Invalid data'
                })
            }
            const {email, pass} = request.body;
            const user = User.findOne({ email});
            if (!user) {
                return res.status(400).json({message: 'Couldnt find user with such credentials'})
            }
            const isMatch = await bcrypt.compare(pass, user.pass);
            if (!isMatch) {
                return response.status(400).json({ message: 'password is incorrect'})
            }
            const token = jwt.sign(
                {userId: user.id},
                config.get('jwtSecret'),
                {expiresIn: '1h'}
            )
            response.json({token, userId: user.id})
        } catch(e){
            response.status(500).json({message: `Error: ${e}`})
        }
})

module.exports = router