const express = require('express')
const router = express.Router()

const { Food } = require('./model')


//-- ROUTES --//
router.get('/', (req, res) => {
    console.log('Sending...')
    Food.findAll()
    .then(food => {
        res.render('create-food.njk', {menu: food})
    })
})

router.get('/api/', (req, res) => {
    console.log('Sending Api...')
    Food.findAll().then(food => 
        res.json(food)
    )
})

router.post('/create',async (req, res) => {
    if(req.body.name){
        newFood = Food.build({name: req.body.name, description: req.body.description, link: req.body.link})
        await newFood.save()
    }
    console.log('Created')
    res.redirect('/')
})

router.get('/edit/:id', async (req, res) => {
    const search = await Food.findByPk(req.params.id, {
        attributes: ['id', 'name', 'description', 'link'],
        limit: 1,
    })
    console.log('Sending...')
    res.render('edit', {food: search  })
})

router.post('/edit/:id', async (req, res) => {
    const search = await Food.findByPk(req.params.id, {
        attributes: ['id', 'name', 'description', 'link'],
        limit: 1,
    })
    search.update({
        name: req.body.name,
        description: req.body.description,
        link: req.body.link
    })
    console.log('Updated...')

    res.redirect('/')
})

router.get('/delete/:id', (req, res) => {
    Food.destroy({
        where: {
            id: req.params.id
        }
    })
    console.log('Deleted...')
    res.redirect('/')
})

module.exports = router;