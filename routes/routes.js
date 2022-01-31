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
        check('email', 'email is invalid').isEmail()                    //check if email is invalid
    ],
    async (request, response) => {
        try {
            const errors = validationResult(request.body);
            if (!errors.isEmpty()) {                                    //send response with errors joined in one string, if they exist
                const arr = (errors.array().map((e)=>{return e.msg}));
                return response.status(400).json({
                    message: 'Error: ' + arr.join(';')
                });
            }
            const {email, userName, password, admin} = request.body;
            const candidate = await User.findOne({ email: email});                                              
            if (candidate) {                                                                            //if user with such email already exists, throw error
                return response.status(400).json({message: 'Error: This email is already registered'})
            }
            const hashedPass = await bcrypt.hash(password, 10);                                         //hash password
            const user = new User({ email, userName, password: hashedPass, admin});                     //create new user
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
            const item = await Item.findOne({_id: itemsToDelete[0]});           //find any item from this collection and get collection id
            const collectionRef = item.collectionRef;
            await itemsToDelete.map(async(itemId)=>{
                await Comment.deleteMany({itemId: itemId});                     //delete comments of each item
                await Item.findOneAndDelete({_id: itemId});                     //delete selected items by one
            })
            const collection = await Collection.findOne({_id: collectionRef});  
            const updateData = await collection.items.filter((item)=>{
                if(itemsToDelete.includes(String(item))) {                      //define array of collection items without deleted items in it
                    return false
                } else {
                    return true
                }
            })
            await Collection.findOneAndUpdate({_id: collectionRef}, {items: updateData})
            setTimeout(()=>{
                response.status(201).json({message: 'Item(s) is(are) deleted successfully'});
            },0)
        } catch(e){
            response.status(500).json({message: `Error: ${e}`})
        }
    })

router.post(
    '/authentication', 
    [
        check('email', 'Error: Email is invalid').normalizeEmail().isEmail(),                   //check if email and password are incorrect
        check('password', 'Error: Enter password').exists()
    ],
    async (request, response) => {
        try {
            const errors = validationResult(request);
            if (!errors.isEmpty()) {
                const arr = (errors.array().map((e)=>{return e.msg}));
                return response.status(400).json({                                              //return errors combined in one string if they exist
                    message: arr.join(';')
                });
            }
            const {email, password} = request.body;
            const user = await User.findOne({email});
            if (!user) {
                return response.status(400).json({message: 'Error: Couldnt find user with such email.'})
            }
            if (user.blocked) {
                throw new Error('Error: this account is blocked');
            }
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return response.status(400).json({ message: 'Error: password is incorrect'})
            }
            const token = jwt.sign(
                {userId: user.id},
                config.get('jwtSecret'),
                {expiresIn: '1h'}
            )
            
            response.json({token, userId: user.id, email: user.email, admin: user.admin, blocked: user.blocked})
        } catch(e){
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

            if (checkboxField1 === '') {                            //if any checkbox field wasn't defined, set its value to false
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
                stringField3,                                                       //create new item
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
                items: [...collectionOfItem.items, item._id]                        //add currently created item 
            }                                                                       //to it`s collection 'items' array
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
            console.log(request.body.data)
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
            const tagsCount = [];
            let tagsObj = {};
            items.map((item) => {
                const tags = item.tags.split(' ');                  //get tags by splitting 'tags' field of each item
                tags.map((tag)=>{
                    const keys = Object.keys(tagsObj);
                    const tagText = tag;
                    if (tagsObj[tagText]) {                         //if such tag already exists in object, add +1 to its counter
                    tagsObj = {
                        ...tagsObj,
                        [tagText] : tagsObj[tagText] + 1
                        }
                    } else {                                        //else if such tag is not defined in object yet, define it
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
            response.status(201).json(items.splice(-3));                //get last 3 items
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
                return b.items.length - a.items.length;                             //sort collections by amount of their items
            })
            response.status(201).json(collections.splice(0, 3));                    //and send first three
        } catch (e) {
            response.status(500).json({message: `Error: ${e}`})
        }
        
    }
)

router.get(
    '/getuserstable',
    async (request, response) => {
        try {
            let users = await User.find();                              //find all users
            const usersData = [];
            users.map((user)=>{
                usersData.push({                                        //get required info about each user
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
            if (foundItem.likes.length === 0) {                     //if noone didnt like this item already, define 'likes' field 
                updateData = {                                      //and add user id as the one who liked
                    likes : [userId]
                }
            } else {
                if (foundItem.likes.includes(userId)) {             //if current user already liked this item and if so
                    const updateArray = [...foundItem.likes];       //delete it's like
                    const index = updateArray.indexOf(userId);
                    updateArray.splice(index, 1);
                    updateData = {
                        likes : updateArray
                    }
                } else {                                            //if user didn't like it yet, add his id to array
                    updateData = {                                  //of those who liked
                        likes : [...foundItem.likes, userId]
                    }
                }
            }
            const updateItem = await Item.findOneAndUpdate({_id: itemId}, updateData);      //update item`s data
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
            console.log(request.body.data)
            const item = await Item.findOne({_id: request.body.data.itemId});
            let collection;
            if (item && item.collectionRef) {
                collection = await Collection.findOne({_id: item.collectionRef})
            } else {
                collection = await Collection.findOne({_id: request.body.data.collectionId})
            }
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
                if (key.includes('Field') && collection[key]){              //if field is input, create object with required data
                    collectionHeaders.push({
                        headerName: collection[key],
                        fieldName: key
                    })
                }
            }
            collectionHeaders = collectionHeaders.map((header)=>{
                return {
                    Header: header.headerName,
                    accessor: header.headerName==='id'?'_id':header.fieldName,      //prepare data to send to frontend
                    fieldType: header.fieldName,
                }
            })
            const collectionItems = await Item.find({collectionRef: collection._id}); //find all items of this collection

            response.status(201).json({
                headers: collectionHeaders,
                items: collectionItems,
                collectionId: collection._id
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
            const items = Item.find({collectionRef: collectionId});
            items.map(async item=>{
                await Comment.deleteMany({itemId: item._id})
            })
            await Item.deleteMany({collectionRef: collectionId});       //delete collection and items of this collection
            await Collection.findOneAndDelete({_id: collectionId});
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
            ).sort({ score: {$meta: "textScore"}})          //find collections by query and sort by relevancy
            let collectionResults = [];
            let itemIds = [];
            itemIds = collections.reduce((prev, current)=>{
                return prev.concat(current.items)           //add item ids to one array
                }, [])
            await itemIds.map(async(id)=>{
                const foundItem = await Item.findOne({_id: id});
                if (foundItem) {                            //if found item exists, add it to resulting array
                    collectionResults.push(foundItem);
                }
            })

            const items = await Item.find(
                { $text: {$search: query}},                 //find items
                { score: {$meta: "textScore"}}
            ).sort({ score: {$meta: "textScore"}})  

            let itemResults = items;

            const comments = await Comment.find(            //find comments
                { $text: {$search: query}},
                { score: {$meta: "textScore"}}
            ).sort({ score: {$meta: "textScore"}});

            await comments.map(async(comment)=>{
                const foundItem = await Item.findOne({_id: comment.itemId});
                if (foundItem) {
                    itemResults.push(foundItem)             //add comments search results to items
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
                userName: user.userName,                    //create new comment
                userId,
                itemId,
            });
            await comment.save();
            const item = await Item.findOne({_id: itemId}); 
            const updateData = {
                comments: [...item.comments, comment._id]   //add created comment to array of existing comments of this item
            }
            const updatedItem = await Item.findOneAndUpdate({_id: itemId}, updateData) //update item`s field 'comments' with new comment
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
            await User.findOneAndUpdate({_id: userId},{blocked: !user.blocked});    //update 'blocked' status of user
            await User.findOne({_id: userId});
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
            const collections = await Collection.deleteMany({creator: userId});     //delete collection of user
            const items = await Item.deleteMany({creator: userId});                 //delete items of user
            const comments = await Comment.deleteMany({userId: userId})             //delete comments of user
            const user = await User.findOneAndDelete({_id: userId});                //delete user
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
            await User.findOneAndUpdate({_id: userId},{admin: !user.admin});//demote user if he was an admin and promote if he wasnt
            await User.findOne({_id: userId});                            
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
            if (userData.blocked !== user.blocked || userData.admin !== user.admin || !user) {  //check if some of user`s permissions
                nothingChanged = false;                                                         //changed and send boolean in response
            }               
            response.status(201).json(nothingChanged);
        } catch (e) {
            response.status(500).json({message: `Error: ${e}`})
        }
        
    }
)


module.exports = router