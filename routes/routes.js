const { Router } = require('express');
const router = Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Item = require('../models/Item');
const Collection = require('../models/Collection');
const {check, validationResult} = require('express-validator');
const jwt = require('jsonwebtoken');
const config = require('config');
const cloudinaryName = config.get('cloudinaryName');
const cloudinaryApiKey = config.get('cloudinaryApiKey');
const cloudinarySecret = config.get('cloudinarySecret');
const cloudinary = require('cloudinary').v2;
cloudinary.config({
    cloud_name: cloudinaryName,
    api_key: cloudinaryApiKey,
    api_secret: cloudinarySecret,
})

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
            response.json({token, userId: user.id, email: user.email})
        } catch(e){
            console.log(e);
            response.status(500).json({message: `Error: ${e}`})
        }
    })

router.post(
    '/uploadimage',
    async (request, response) => {
        try {
            const fileString = request.body.data;
            const uploadedResponse = await cloudinary.uploader.upload(fileString, {
                uploadPreset: 'dev_setups'
            })
            console.log(uploadedResponse);
            response.json({msg: "success", url: uploadedResponse.url})
        } catch (error) {
            console.log(error);
            response.status(500).json({msg: "something went wrong"})
        }
        
    }
)

router.post(
    '/uploadcollection',
    async (request, response) => {
        try {
            const {
                creator,
                name,
                description,
                topic,
                imageURL,
                numberField1,
                numberField2,
                numberField3,
                stringField1,
                stringField2,
                stringField3,
                textField1,
                textField2,
                textField3,
                dateField1,
                dateField2,
                dateField3,
                checkboxField1,
                checkboxField2,
                checkboxField3
            } = request.body.data;
            console.log(name);
            console.log(request.body);
            const collection = new Collection({ creator, name, description, topic, imageURL, numberField1, numberField2, 
                numberField3, stringField1, stringField2, stringField3, textField1, textField2, textField3, 
                dateField1, dateField2, dateField3, checkboxField1, checkboxField2, checkboxField3});
            console.log(collection);
            await collection.save();
            response.status(201).json({message: 'Collection is created successfully'});
        } catch (error) {
            response.status(500).json({message: `Something went wrong! Try again + ${error}`})
            console.log(error);
        }
        
    }
)

router.post(
    '/uploaditem',
    async (request, response) => {
        try {
            const {
                name,
                tags,
                numberField1,
                numberField2,
                numberField3,
                stringField1,
                stringField2,
                stringField3,
                textField1,
                textField2,
                textField3,
                StringField1,
                StringField2,
                StringField3,
                checkboxField1,
                checkboxField2,
                checkboxField3,
                collectionRef,
            } = request.body.data;
            const item = new Item({ 
                name,
                tags,
                numberField1,
                numberField2,
                numberField3,
                stringField1,
                stringField2,
                stringField3,
                textField1,
                textField2,
                textField3,
                StringField1,
                StringField2,
                StringField3,
                checkboxField1,
                checkboxField2,
                checkboxField3,
                collectionRef,});
            await item.save();
            const abc = await Collection.findOne({_id: collectionRef});
            console.log(request.body.data);
            const updateData = {
                items: [...abc.items, item._id]
            }
            const collection = await Collection.findOneAndUpdate({_id: collectionRef}, updateData);
            const bcd = await Collection.findOne({_id: collectionRef});
            response.status(201).json({message: 'Item is added successfully'});
        } catch (error) {
            response.status(500).json({message: `Something went wrong! Try again + ${error}`})
        }
        
    }
)

router.post(
    '/fetchcollections',
    async (request, response) => {
        try {
            const userId = request.body.data.userId;
            const userCollections = await Collection.find({creator: userId});
            response.status(201).json(userCollections);
        } catch (error) {
            console.log(error);
        }
        
    }
)

router.post(
    '/getcollectiontable',
    async (request, response) => {
        try {
            
            const collectionId = request.body.data.collectionId;


            const collection = await Collection.findOne({_id: collectionId});

            let collectionHeaders = [{
                headerName: 'id',
                fieldName: 'id'
            },
            {
                headerName: 'name',
                fieldName: 'name'
            },
            {
                headerName: 'tags',
                fieldName: 'tags'
            }];
            for (let key in collection) {
                if (key.includes('Field') && collection[key]){
                    collectionHeaders.push({
                        headerName: collection[key],
                        fieldName: key
                    })
                }
            }
            collectionHeaders = collectionHeaders.map((header)=>{
                return {
                    Header: header.headerName,
                    accessor: header.headerName==='id'?'_id':header.fieldName,
                    fieldType: header.fieldName,
                }
            })

            const collectionItems = await Item.find({collectionRef: collectionId});

            response.status(201).json({
                headers: collectionHeaders,
                items: collectionItems
            });
        } catch (error) {
            console.log(error);
        }
        
    }
)

router.post(
    '/updatecollection',
    async (request, response) => {
        try {
            
            const {
                collectionId,
                name,
                description,
                topic
            } = request.body.data;

            const updateData = {
                name,
                description,
                topic
            }


            const collection = await Collection.findOneAndUpdate({_id: collectionId}, updateData);


            console.log(collection)

            response.status(201).json('ok');
        } catch (error) {
            console.log(error);
        }
        
    }
)

router.post(
    '/deletecollection',
    async (request, response) => {
        try {
            
            const collectionId = request.body.data.collectionId;


            const items = await Item.deleteMany({collectionRef: collectionId});
            const collection = await Collection.findOneAndDelete({_id: collectionId});

            console.log(collection)

            response.status(201).json('ok!');
        } catch (error) {
            console.log(error);
        }
        
    }
)

router.post(
    '/getcollectiondata',
    async (request, response) => {
        try {
            
            const collectionId = request.body.data.collectionId;


            const collection = await Collection.findOne({_id: collectionId});

            console.log(collection)

            response.status(201).json(collection);
        } catch (error) {
            console.log(error);
        }
        
    }
)

module.exports = router