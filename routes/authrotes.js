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
            return response.status(400).json({
                errors: errors.array(),
                message: 'Error! Invalid data'
            })
        }
        const {email, pass} = request.body;
        const candidate = await User.findOne({ email});
        if (candidate) {
            response.status(400).json({message: 'This email is already registered'})
        }
        const hashedPass = await bcrypt.hash(pass, 1337);
        const user = new User({ email, pass: hashedPass});
        await user.save();
        res.status(201).json({message: 'Account is created successfully'});

    } catch(e){
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