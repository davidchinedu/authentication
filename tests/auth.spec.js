const request = require("supertest");
const app = require("../app");


describe('Test POST /registration', ()=>{
test('it should respond with a 201 created, to register a new user', async()=>{
const response = await request(app)
.post('/auth/register')
.send({
    firstName: 'chi',
    lastName: 'neo',
    email: 'sak',
    password: 'iii',
    phone:'235'
})
.expect('Content-Type', /json/)
.expect(200)

})



describe('test POST /login',  ()=>{
test('it should respond with 200, to verify that login was successful', async()=>{
    const response = await request(app)
    .post('/auth/login')
    .send({
        
        email: 'sak',
        password: 'iii'
    })
    .expect('Content-Type', /json/)
    .expect(200)
    
    })

})

})