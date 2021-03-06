const chai = require('chai');
const sinon = require('sinon');
const chaiHttp = require('chai-http');
const { MongoClient, ObjectId } = require('mongodb');
const { getConnection } = require('./connectionMock');
const app = require('../index');

const { expect } = chai;

chai.use(chaiHttp);

const INVALID_ID_1 = '12345678';
const VALID_ID_1 = '617b6a525c769ab68b4036a0';
const VALID_ID_2 = '617b6a525c769ab68b4036a1';

describe('Testes para a rota /tasks', function () {
  let connectionMock;
  before(async function () {
    connectionMock = await getConnection();
    sinon.stub(MongoClient, 'connect').resolves(connectionMock);
  });

  after(async function () {
    MongoClient.connect.restore();
    await connectionMock.db('Ebytr').collection('Tasks').deleteMany({});
  });

  describe('Em caso de erro desconhecido', function () {
    let response;

    before(async function () {
      MongoClient.connect.resolves(null);
      response = await chai.request(app).get('/tasks');
    });

    after(async function () {
      MongoClient.connect.resolves(connectionMock);
    });

    it('deve receber um código HTTP 500', function () {
      expect(response).to.have.status(500);
    });

    it('Deve receber um objeto de erro', function () {
      expect(response.body).to.be.an('object');
    });

  });

  describe('Testes para o endpoint GET', function () {
    let response;

    before(async function () {
      response = await chai.request(app).get('/tasks');
    });

    it('deve receber um código HTTP 200', function () {
      expect(response).to.have.status(200);
    });

    it('deve receber um array com as tarefas cadastradas', function () {
      expect(response.body).to.be.an('array');
    });
  });

  describe('Testes para o endpoint POST', function () {
    describe('Quando a requisição não é bem-sucedida', function () {
      describe('Quando não passamos um body', function () {
        let response;

        before(async function () {
          response = await chai.request(app).post('/tasks');
        });

        it('Deve receber um código HTTP 422', function () {
          expect(response).to.have.status(422);
        });

        it('Deve receber um objeto de erro', function () {
          expect(response.body).to.be.an('object');
        });

        it('Deve retornar a mensagem de erro correta', function () {
          expect(response.body.message).to.be.equal('"name" is required');
        });
      });

      describe('Quando passamos um body e o Joi retorna erro de validação', function () {
        let response;

        before(async function () {
          response = await chai.request(app).post('/tasks')
            .send({ name: 'Johnatas', status: '', createdAt: '21/10/2021' });
        });

        it('Deve receber um código HTTP 422', function () {
          expect(response).to.have.status(422);
        });

        it('Deve receber um objeto com a nova tarefa cadastrada', function () {
          expect(response.body).to.be.an('object');
        });

        it('Deve retornar a mensagem de erro correta', function () {
          expect(response.body.message).to.be.equal('"status" is not allowed to be empty');
        });
      });
    });

    describe('Quando a requisição vai pelo fluxo bem-sucedido', function () {
      let response;

      before(async function () {
        response = await chai.request(app).post('/tasks')
          .send({ name: 'Johnatas', status: 'pendente', createdAt: '20/10/2021' });
      });

      it('deve receber um código HTTP 201', function () {
        expect(response).to.have.status(201);
      });

      it('deve receber um objeto com a nova tarefa cadastrada', function () {
        expect(response.body).to.be.an('object');
      });

      it('o objeto retornado deve ter as chaves referentes a tarefa', function () {
        expect(response.body).to.have.all.keys('_id', 'name', 'status', 'createdAt');
      });
    });
  });

  describe('Testes para o endpoint PUT', function () {
    describe('Quando a requisição não é bem-sucedida', function () {
      describe('Quando não passamos body e passamos ID inválido', function () {
        let response;

        before(async function () {
          response = await chai.request(app).put(`/tasks/${INVALID_ID_1}`);
        });

        it('deve receber um código HTTP 422', function () {
          expect(response).to.have.status(422);
        });

        it('deve receber um objeto de erro', function () {
          expect(response.body).to.be.an('object');
        });

        it('deve retornar a mensagem de erro correta', function () {
          expect(response.body.message).to.be.equal('"name" is required');
        });
      });

      describe('Quando passamos body válido e ID inválido', function () {
        let response;

        before(async function () {
          response = await chai.request(app).put(`/tasks/${INVALID_ID_1}`)
            .send({ name: 'Johnatas', status: 'pendente', createdAt: '20/10/2021' });
        });
     
        it('deve receber um código HTTP 404', function () {
          expect(response).to.have.status(404);
        });

        it('deve receber um objeto de erro', function () {
          expect(response.body).to.be.an('object');
        });

        it('deve retornar a mensagem de erro correta', function () {
          expect(response.body.message).to.be.equal('Tarefa não encontrada');
        });
      });
    });

    describe('Quando a requisição é bem-sucedida', function () {
      let response;

      before(async function () {
        await connectionMock.db('Ebytr').collection('Tasks')
          .insertOne({
            _id: ObjectId(VALID_ID_1),
            name: 'Fazer testes 001',
            status: 'pendente',
            createdAt: '28/10/2021',
          });

        response = await chai.request(app).put(`/tasks/${VALID_ID_1}`)
          .send({ name: 'Continuar testes', status: 'andamento', createdAt: '29/10/2021' });
      });

      it('deve receber um código HTTP 200', function () {
        expect(response).to.have.status(200);
      });

      it('deve receber um objeto com a nova tarefa cadastrada', function () {
        expect(response.body).to.be.an('object');
      });

      it('o objeto retornado deve ter as chaves referentes a tarefa', function () {
        expect(response.body).to.have.all.keys('_id', 'name', 'status', 'createdAt');
      });
    });
  });

  describe('Testes para o endpoint DELETE', function () {
    describe('Quando passamos ID inválido', function () {
      let response;

      before(async function () {
        response = await chai.request(app).delete(`/tasks/${INVALID_ID_1}`);
      });

      it('deve receber um código HTTP 204', function () {
        expect(response).to.have.status(204);
      });

      it('deve receber um objeto vazio', function () {
        expect(response.body).to.be.an('object');
      });

      it('deve retornar um objeto vazio', function () {
        expect(response.body).to.be.deep.equal({});
      });
    });

    describe('Quando a requisição é bem-sucedida', function () {
      let response;

      before(async function () {
        await connectionMock.db('Ebytr').collection('Tasks')
          .insertOne({
            _id: VALID_ID_2,
            name: 'Fazer testes 001',
            status: 'pendente',
            createdAt: '28/10/2021',
          });

        response = await chai.request(app).delete(`/tasks/${VALID_ID_2}`);
      });
     
      it('deve receber um código HTTP 204', function () {
        expect(response).to.have.status(204);
      });

      it('deve receber um objeto vazio', function () {
        expect(response.body).to.be.an('object');
      });

      it('deve retornar um objeto vazio', function () {
        expect(response.body).to.be.deep.equal({});
      });
    });
  });
});
