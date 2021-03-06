const router = require('express').Router()
const date = require('dayjs')
const localizedFormat = require('dayjs/plugin/localizedFormat') 
require('dayjs/locale/es')

const { Op, where, REAL, json } = require('sequelize')
const { Pedido, Location, PedidoItems } = require('./PedidoModel')
const Food = require('../Food/FoodModel')
const Customer = require('../Customer/CustomerModel')
const Calendar = require('../Calendar/CalendarModel')

router.get('/api/', async(req, res) => {
    console.log('New request for /pedidos/api')
    selectedDate = date().subtract(5, 'h').second(0).minute(0).hour(0).format('YYYY-MM-DD')
  
    console.log( req.query)

    const reqId         = req.params.id
    const reqCustomer   = req.query.customer
    const reqDelivered  = parseInt(req.query.delivered)
    const reqPaid       = parseInt(req.query.paid)
    const reqLocation   = req.query.location
    const reqCreatedAt  = req.query.createdAt
    const reqAll        = req.query.all
    const since         = req.query.sincePicker
    const until         = req.query.untilPicker
    let pedidoQuery = {}
    
    if (reqAll){
    } else {
        if( reqPaid && reqDelivered){
            console.log('true true')
            pedidoQuery.paid = true
            pedidoQuery.delivered = true
        }
        if(!reqPaid && !reqDelivered){
            console.log('false false')
            pedidoQuery.paid = false
            pedidoQuery.delivered = false
        }
        if (!reqPaid && reqDelivered){
            console.log('false true')
            pedidoQuery.delivered = true
        }   
        if( reqPaid && !reqDelivered){
            console.log('true false')
            pedidoQuery.paid = true
        }
    }
    if (reqLocation){
        searchedLocation = await Location.findOne({
            where: {
                name: reqLocation
            }
        }).catch( e => console.error(e))
    
        pedidoQuery.locationId = searchedLocation.id
    }
    if (reqCustomer){
        searchedCustomer = await Customer.findOne({
            where: {
                name: reqCustomer.trim()
            }
        }).catch((e) => console.error('error: :',e))

        if(searchedCustomer === null){
            res.json(`Error 404.Record with name ${reqCustomer} not found`)
            throw new Error(`Record with name ${reqCustomer} not found.`)
        }
        pedidoQuery.customerId = searchedCustomer.id   
    }
    
    pedidoQuery.createdAt = {[Op.between] : [since, until] }

    pedidos = await Pedido.findAll({
        where: pedidoQuery,
        include: [  
            {
                model: Food,
                through: {
                    attributes: ['quantity']
                },
                order: [[Food, PedidoItems, 'id', 'DESC']]
            },
            {
                model: Location
            },{
                model: Customer
            },
        ],      
    }).catch( e => console.error(e) )
    res.json({ok: true, data: pedidos})
})

router.get('/api/today', async (req, res) => {
    console.log('/pedidos/api/today')
    let pedidoQuery = {}

    const since = req.query.sincePicker || date().format('YYYY-MM-DD')
    const until = req.query.untilPicker || date().add(1, 'day').format('YYYY-MM-DD')

    pedidoQuery.createdAt = {[Op.between] : [since, until] }

    pedidos = await Pedido.findAll({
        where: pedidoQuery,
        attributes: { exclude: ['delivered', 'paid', 'createdAt', 'updatedAt', 'customerId', 'locationId']}
    }).catch(e => console.error(e))
    res.json({ok: true, data: pedidos})
})

router.get('/api/test', async (req, res) => {
    console.log('/pedidos/api/test')
    let pedidoQuery = {}

    const since = req.query.sincePicker || date().format('YYYY-MM-DD')
    const until = req.query.untilPicker || date().add(1, 'day').format('YYYY-MM-DD')
    console.log(since, until)

    pedidoQuery.createdAt = {[Op.between] : [since, until] }

    pedidos = await Pedido.findAll({
        where: pedidoQuery,
        include: [{
            model: Customer,
                attributes: ['id',  'name']
        },{
            model: Location,
                attributes: ['id', 'name']
        },{
            model: Food,
            attributes: ['id'],
            through: {
                attributes: ['quantity']
            }
        }]
    }).catch(e => console.error(e))
    res.json({
        ok: true, 
        data: pedidos
    })
})

router.post('/api/create', async (req, res) => {
    console.log('New request for /pedidos/api/create')
    const formatedDate = date().format('YYYY-MM-DD')
    const newDate = date().format('YYYY-MM-DD HH:MM:ss')
    if(!req.body.customerLocation || !req.body.customerName ){
        return res.json({ok: false, message: 'Faltan datos.' })
    }
    const [pedidoLocation, created] = await Location.findOrCreate({
        where: {
            name: req.body.customerLocation
        }
    }).catch( e => console.error(e))
    const [pedidoCustomer, createdCustomer] = await Customer.findOrCreate({
        where: {
            name: req.body.customerName.trim()
        }
    }).catch( e => console.error(e) )
    const pedido = Pedido.build({
        customerId: pedidoCustomer.id,
        delivered: false,
        total: '',
        paid: false,
        locationId: pedidoLocation.id,
        createdAt: newDate  
    })
    const Menu = await Calendar.findOne({
        where: {
            date: formatedDate  
        },
        include: [
            {model: Food, as: 'Comida1'},
            {model: Food, as: 'Comida2'}
        ]
    }).catch( e => console.error(e))
    const food1Id = Menu.Comida1.id
    const food2Id = Menu.Comida2.id
    pedidoComida1Quantity = PedidoItems.build({
        pedidoId: pedido.id,
        foodId: food1Id,
        quantity: req.body.comida1Quantity || 0
    })
    pedidoComida2Quantity = PedidoItems.build({
        pedidoId: pedido.id,
        foodId: food2Id,
        quantity: req.body.comida2Quantity || 0
    })
    await pedido.save()
    await pedidoComida1Quantity.save()
    await pedidoComida2Quantity.save()
    res.json({ok: true, message: 'Pedido Creado'})
})

router.get('/api/details/:id', async (req, res) => {
    console.log('consulting: /api/details/:id')
    const search = await Pedido.findByPk(req.params.id, {
        include: [
            {model: Food},
            {model: Customer},
            {model: Location}
        ]
    })
    res.json({ok: true, data: search})
})

router.get('/api/locations', async (req, res) => {
    console.log('New request for /pedidos/locations/api')
    const places = await Location.findAll()
    res.json(places)
})

router.post('/api/update/:id', async (req, res) => {    
    console.log('/api/update/id')
    console.log('body', req.body)
    const pedido = await Pedido.findByPk(req.params.id, {include: { model: Food}} ).catch(err => console.error(err))

    if(req.body.delivered != pedido.delivered ){
        console.log('different')
        console.log(req.body.delivered)
        pedido.update({delivered: req.body.delivered})
    }else{
        console.log('no changes')
    }
    if(req.body.paid != pedido.paid){
        console.log('different')
        pedido.update({paid: req.body.paid})
    }else{
        console.log('no changes')
    }
    const customerName      = req.body.customerName
    const customerLocation  = req.body.customerLocation
    const comida1Quantity   = req.body.comida1Quantity
    const comida2Quantity   = req.body.comida2Quantity
    if (customerLocation){   
        const [editedLocation, created] = await Location.findOrCreate({
            where: {
                name: customerLocation
            }
        }).catch( e => console.error(e))
        pedido.update({
            locationId: editedLocation.id
        })
    }
    if (req.body.comida1Quantity || req.body.comida2Quantity ){
        if (req.body.comida1Quantity){
            const items = await PedidoItems.findOne({
                where: {
                    pedidoId: pedido.id,
                    foodId: pedido.food[0].id
                }
            })
            items.update({quantity: comida1Quantity})
            console.log('items')
            console.log(items)
        }
        if (req.body.comida2Quantity){
            const items = await PedidoItems.findOne({
                where: {
                    pedidoId: pedido.id,
                    foodId: pedido.food[1].id
                }
            })
            items.update({quantity: comida2Quantity})
            console.log('items')
            console.log(items)
            pedido.update({})
        }
    }
    const pedidoUpdated = await Pedido.findByPk(req.params.id)
    res.json(pedidoUpdated)
})

router.delete('/api/delete/:id', async (req, res) => {
    console.log('New request for /api/delete/:id')
    Pedido.destroy({
        where: {
            id: req.params.id
        }
    }).catch(e => console.error(e))
    console.log('Succesfully deleted record.')
    res.json({error: false, message: 'Succesfully deleted.'})      
})

module.exports = router;
