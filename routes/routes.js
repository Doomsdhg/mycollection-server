const { Router } = require('express');
const router = Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Item = require('../models/Item');
const Comment = require('../models/Comment');
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
            const errors = validationResult(request.body);
            if (!errors.isEmpty()) {
                const arr = (errors.array().map((e)=>{return e.msg}));
                return response.status(400).json({
                    message: 'Error: ' + arr.join(';')
                });
            }
            const {email, userName, password, admin} = request.body;
            const candidate = await User.findOne({ email: email});
            if (candidate) {
                return response.status(400).json({message: 'Error: This email is already registered'})
            }
            const hashedPass = await bcrypt.hash(password, 10);
            const user = new User({ email, userName, password: hashedPass, admin});
            await user.save();
            response.status(201).json({message: 'Account is created successfully'});

        } catch(e){
            response.status(500).json({message: `Error: ${e}`})
        }
    })

    router.post(
    '/deleteitems', 
    async (request, response) => {
        try {
            const itemsToDelete = request.body.data.itemsData.itemsToDelete;
            const collectionRef = request.body.data.itemsData.collectionRef;
            let deletedItems = [];
            await itemsToDelete.map(async(itemId)=>{
                await Item.findOneAndDelete({_id: itemId});
            })

            const collection = await Collection.findOne({_id: collectionRef});

            const updateData = await collection.items.filter((item)=>{
                if(itemsToDelete.includes(String(item))) {
                    return false
                } else {
                    return true
                }
            })

            await Collection.findOneAndUpdate({_id: collectionRef}, {items: updateData})
                
            setTimeout( ()=>{
                response.status(201).json({message: 'Item(s) is(are) deleted successfully'});
            },0)
        } catch(e){
            response.status(500).json({message: `Error: ${e}`})
        }
    })

router.post(
    '/deleteitems', 
    async (request, response) => {
        try {
            const itemsToDelete = request.body.data;

            await itemsToDelete.map(async(itemId)=>{
                await Item.findOneAndDelete({_id: itemId});
            })
            
            setTimeout(()=>{
                response.status(201).json({message: 'Account is created successfully'});
            },0)
            

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
            if (!user) {
                return response.status(400).json({message: 'Couldnt find user with such email'})
            }
            if (user.blocked) {
                throw new Error('this account is blocked');
            }
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return response.status(400).json({ message: 'password is incorrect'})
            }
            const token = jwt.sign(
                {userId: user.id},
                config.get('jwtSecret'),
                {expiresIn: '1h'}
            )
            
            response.json({token, userId: user.id, email: user.email, admin: user.admin, blocked: user.blocked})
        } catch(e){
            console.log(e);
            response.status(500).json({message: `Error: ${e}`})
        }
    })

router.post(
    '/uploadimage',
    async (request, response) => {
        try {
            const fileString = request.body.data.img;
            const uploadedResponse = await cloudinary.uploader.upload(fileString, {
                uploadPreset: 'dev_setups'
            })
            response.json({msg: "success", url: uploadedResponse.url})
        } catch (e) {
            console.log(e);
            response.status(500).json({message: `Error: ${e}`})
        }
        
    }
)

router.post(
    '/uploadcollection',
    async (request, response) => {
        try {
            const collection = new Collection(request.body.data.updateData);
            await collection.save();
            response.status(201).json({message: 'Collection is created successfully'});
        } catch (e) {
            response.status(500).json({message: `Error: ${e}`})
            console.log(e);
        }
        
    }
)

router.post(
    '/uploaditem',
    async (request, response) => {
        try {
            let {
                creator,
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
                dateField1,
                dateField2,
                dateField3,
                checkboxField1,
                checkboxField2,
                checkboxField3,
                collectionRef,
            } = request.body.data.items;

            if (checkboxField1 === '') {
                checkboxField1 = false;
            }
            if (checkboxField2 === '') {
                checkboxField2 = false;
            }
            if (checkboxField3 === '') {
                checkboxField3 = false;
            }

            const item = new Item({ 
                creator,
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
                dateField1,
                dateField2,
                dateField3,
                checkboxField1,
                checkboxField2,
                checkboxField3,
                collectionRef,
                items: []});
            await item.save();
            const collectionOfItem = await Collection.findOne({_id: collectionRef});
            const updateData = {
                items: [...collectionOfItem.items, item._id]
            }
            const collection = await Collection.findOneAndUpdate({_id: collectionRef}, updateData);
            response.status(201).json({message: 'Item is added successfully'});
        } catch (e) {
            response.status(500).json({message: `Error: ${e}`})
        }
        
    }
)

router.post(
    '/fetchcollections',
    async (request, response) => {
        try {
            const userId = request.body.data.userId;
            const userCollections = await Collection.find({creator: userId});
            const user = await User.findOne({_id: userId});
            response.status(201).json({collections: userCollections, owner: {name: user.userName, id: user._id}});
        } catch (e) {
            response.status(500).json({message: `Error: ${e}`})
        }
        
    }
)

router.post(
    '/updateitem',
    async (request, response) => {
        try {
            const itemId = request.body.data.updateData.itemId;
            const foundItem = await Item.findOneAndUpdate({_id: itemId},request.body.data.updateData.update);
            const item = await Item.findOne({_id: itemId});
            response.status(201).json('ok');
        } catch (e) {
            response.status(500).json({message: `Error: ${e}`})
        }
        
    }
)

router.post(
    '/getitem',
    async (request, response) => {
        try {
            const itemId = request.body.data.itemId;
            const item = await Item.findOne({_id: itemId});
            response.status(201).json(item);
        } catch (e) {
            response.status(500).json({message: `Error: ${e}`})
        }
        
    }
)

router.post(
    '/getlikes',
    async (request, response) => {
        try {
            const itemId = request.body.data.requiredData.itemId;
            const userId = request.body.data.requiredData.userId;
            const foundItem = await Item.findOne({_id: itemId});
            const liked = foundItem.likes.includes(userId)?true:false
            const likesAmount = foundItem.likes.length;
            
            response.status(201).json({
                liked,
                likesAmount
            });
        } catch (e) {
            response.status(500).json({message: `Error: ${e}`})
        }
        
    }
)

router.get(
    '/gettags',
    async (request, response) => {
        try {
            
            const items = await Item.find({'tags': { $exists: true, $ne: null }});
            let tagsArray = [];
            const tagsCount = [];
            let tagsObj = {};
            items.map((item) => {
                const tags = item.tags.split(' ');
                
                tags.map((tag)=>{
                    const keys = Object.keys(tagsObj);
                    const tagText = tag;
                    
                    if (tagsObj[tagText]) {
                    tagsObj = {
                        ...tagsObj,
                        [tagText] : tagsObj[tagText] + 1
                        }
                    } else {
                    tagsObj = {
                        ...tagsObj,
                        [tagText] : 1
                        }
                    }
                })
            })
            response.status(201).json(tagsObj);
        } catch (e) {
            response.status(500).json({message: `Error: ${e}`})
        }
        
    }
)

router.get(
    '/getlastitems',
    async (request, response) => {
        try {
            const items = await Item.find();
            response.status(201).json(items.splice(-3));
        } catch (e) {
            response.status(500).json({message: `Error: ${e}`})
        }
        
    }
)

router.get(
    '/getbiggestcollections',
    async (request, response) => {
        try {
            let collections = await Collection.find();
            collections.sort(function(a, b){
                return b.items.length - a.items.length;
            })
            response.status(201).json(collections.splice(0, 3));
        } catch (e) {
            response.status(500).json({message: `Error: ${e}`})
        }
        
    }
)

router.get(
    '/getuserstable',
    async (request, response) => {
        try {
            
            let users = await User.find();
            const usersData = [];
            users.map((user)=>{
                usersData.push({
                    id: user._id,
                    username: user.userName,
                    email: user.email,
                    blocked: user.blocked,
                    admin: user.admin
                })
            })

            response.status(201).json(usersData);
        } catch (e) {
            response.status(500).json({message: `Error: ${e}`})
        }
        
    }
)

router.post(
    '/uploadreaction',
    async (request, response) => {
        try {
            
            const {
                itemId,
                userId,
                liked,
            } = request.body.data.reaction;
            const foundItem = await Item.findOne({_id: itemId});
            let updateData;
            if (foundItem.likes.length === 0) {
                updateData = {
                    likes : [userId]
                }
            } else {
                if (foundItem.likes.includes(userId)) {
                    
                    const updateArray = [...foundItem.likes];
                    const index = updateArray.indexOf(userId);
                    updateArray.splice(index, 1);
                    updateData = {
                        likes : updateArray
                    }
                } else {
                    updateData = {
                        likes : [...foundItem.items, userId]
                    }
                }
            }
            const updateItem = await Item.findOneAndUpdate({_id: itemId}, updateData);
            const updatedItem = await Item.findOne({_id: itemId});
            response.status(201).json('ok');
        } catch (e) {
            response.status(500).json({message: `Error: ${e}`})
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
        } catch (e) {
            response.status(500).json({message: `Error: ${e}`})
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
            } = request.body.data.update;

            const updateData = {
                name,
                description,
                topic
            }

            const collection = await Collection.findOneAndUpdate({_id: collectionId}, updateData);

            response.status(201).json('ok');
        } catch (e) {
            response.status(500).json({message: `Error: ${e}`})
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
            response.status(201).json('ok!');
        } catch (e) {
            response.status(500).json({message: `Error: ${e}`})
        }
        
    }
)

router.post(
    '/getcollectiondata',
    async (request, response) => {
        try {
            const collectionId = request.body.data.collectionId;
            const collection = await Collection.findOne({_id: collectionId});
            response.status(201).json(collection);
        } catch (e) {
            response.status(500).json({message: `Error: ${e}`})
        }
        
    }
)

router.post(
    '/search',
    async (request, response) => {
        try {
            const {query} = request.body.data;
            const collections = await Collection.find(
                { $text: {$search: query}},
                { score: {$meta: "textScore"}}
            ).sort({ score: {$meta: "textScore"}})
            let collectionResults = [];
            let itemIds = [];
            itemIds = collections.reduce((prev, current)=>{
                return prev.concat(current.items)
                }, [])

            await itemIds.map(async(id)=>{
                const foundItem = await Item.findOne({_id: id});
                if (foundItem) {
                    collectionResults.push(foundItem);
                }
            })

            const items = await Item.find(
                { $text: {$search: query}},
                { score: {$meta: "textScore"}}
            ).sort({ score: {$meta: "textScore"}})  

            let itemResults = items;

            const comments = await Comment.find(
                { $text: {$search: query}},
                { score: {$meta: "textScore"}}
            ).sort({ score: {$meta: "textScore"}});

            await comments.map(async(comment)=>{
                const foundItem = await Item.findOne({_id: comment.itemId});
                if (foundItem) {
                    itemResults.push(foundItem)
                }
            })

            setTimeout(()=>{
                response.status(201).json({
                    collections: [...collectionResults], 
                    items: [...itemResults]});
            },0)
        } catch (e) {
            response.status(500).json({message: `Error: ${e}`})
        }
        
    }
)

router.post(
    '/createcomment',
    async (request, response) => {
        try {
            const {
                text,
                userId,
                itemId
                } = request.body.data.comment;

            const user = await User.findOne({_id: userId});

            const comment = new Comment({
                text,
                userName: user.userName,
                userId,
                itemId,
            });
            await comment.save();

            const item = await Item.findOne({_id: itemId});

            const updateData = {
                comments: [...item.comments, comment._id]
            }

            const updatedItem = await Item.findOneAndUpdate({_id: itemId}, updateData)

            response.status(201).json('comment posted');
        } catch (e) {
            response.status(500).json({message: `Error: ${e}`})
        }
        
    }
)

router.post(
    '/getcomments',
    async (request, response) => {
        try {
            const itemId = request.body.data.itemId;
            const comments = await Comment.find({itemId: request.body.data.itemId});

            response.status(201).json(comments);
        } catch (e) {
            response.status(500).json({message: `Error: ${e}`})
        }
        
    }
)

router.post(
    '/blockuser',
    async (request, response) => {
        try {
            const userId = request.body.data.userId;
            const user = await User.findOne({_id: userId});
            const updateUser = await User.findOneAndUpdate({_id: userId},{blocked: !user.blocked});
            const updatedUser = await User.findOne({_id: userId});
            response.status(201).json('ok');
        } catch (e) {
            response.status(500).json({message: `Error: ${e}`})
        }
        
    }
)

router.post(
    '/deleteuser',
    async (request, response) => {
        try {
            const userId = request.body.data.userId;
            const user = await User.findOneAndDelete({_id: userId});

            response.status(201).json('ok');
        } catch (e) {
            response.status(500).json({message: `Error: ${e}`})
        }
        
    }
)

router.post(
    '/promoteuser',
    async (request, response) => {
        try {
            const userId = request.body.data.userId;
            const user = await User.findOne({_id: userId});
            const updateUser = await User.findOneAndUpdate({_id: userId},{admin: !user.admin});
            const updatedUser = await User.findOne({_id: userId});
            response.status(201).json('ok');
        } catch (e) {
            response.status(500).json({message: `Error: ${e}`})
        }
        
    }
)

router.post(
    '/checkuserdata',
    async (request, response) => {
        try {
            const userId = request.body.data.userData.userId;
            const userData = request.body.data.userData;
            const user = await User.findOne({_id: userId});
            let nothingChanged = true;
            if (userData.blocked !== user.blocked || userData.admin !== user.admin || !user) {
                nothingChanged = false;
            }
            response.status(201).json(nothingChanged);
        } catch (e) {
            response.status(500).json({message: `Error: ${e}`})
        }
        
    }
)


module.exports = router