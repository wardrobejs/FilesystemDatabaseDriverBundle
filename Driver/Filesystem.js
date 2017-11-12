const Driver = require('@wardrobe/databasebundle').Driver,
      Engine = require('tingodb')({nativeObjectID: true});

class Filesystem extends Driver
{
    constructor (container)
    {
        super();
        let database_directory = path.join(container.getParameter('project_dir'), 'var', 'database');

        fs.ensureDirSync(database_directory);

        this.db = new Engine.Db(database_directory, {});
    }

    async find (model, id)
    {
        return await this.findOneBy(model, schema.getPrimary(), id);
    }

    async findAll (model)
    {
        return await this.findBy(model, undefined, undefined);
    }

    async findOneBy (model, by, value)
    {
        return (await this.findBy(model, by, value))[0] || null;
    }

    async findBy (model, by, value)
    {
        let schema     = model.getSchema();
        let collection = this.db.collection(`${schema.getName()}.db`);
        let operation  = {};

        if (by && value) {
            operation[this._resolveBy(schema, by)] = value;
        }

        return await new Promise((resolve, reject) => {
            collection.find(operation).toArray((err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r.map(o => {
                    let entity = this._objectToEntity(model, o);

                    Object.defineProperty(entity, '__hydrated__', {
                        writable:   false,
                        enumerable: false,
                        value:      true
                    });
                    return entity;
                }));
            });
        });
    }

    count ()
    {

    }

    async save (model, entity)
    {
        let schema     = model.getSchema();
        let collection = this.db.collection(`${schema.getName()}.db`);

        Object.keys(schema).forEach(async (name) => {
            let nameKey   = {};
            nameKey[name] = 1;
            collection.createIndex(nameKey, {
                unique: schema[name].unique
            });
        });

        if (typeof entity.__hydrated__ !== 'undefined') {
            return await new Promise((resolve, reject) => {
                let find = {};

                find[schema.getPrimary()] = entity[schema.getPrimary(true)];

                collection.update(find, this._entityToObject(entity), (err, r) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(r);
                });
            });
        }

        entity[schema.getPrimary(true)] = new Engine.ObjectID(); // new ObjectID?

        return await new Promise((resolve, reject) => {
            collection.insert(this._entityToObject(entity), (err, r) => {
                if (err) {
                    return reject(err);
                }

                entity[schema.getPrimary(true)] = r[0]._id;

                resolve();
            });
        });
    }

    async remove (model, entity)
    {
        let schema     = model.getSchema();
        let collection = this.db.collection(`${schema.getName()}.db`);

        let operation = {};

        operation[schema.getPrimary()] = entity[schema.getPrimary(true)];

        return await collection.remove(operation);
    }

    _entityToObject (entity)
    {
        let schema = entity.constructor.getSchema();
        let result = {};

        Object.keys(schema).forEach(key => {
            if (entity.hasOwnProperty(schema[key].key)) {
                result[key] = entity[schema[key].key];
            }
        });

        return result;
    }

    _objectToEntity (model, object)
    {
        let schema = model.getSchema();
        let entity = new model();
        for (let attr in object) {
            if (object.hasOwnProperty(attr)) {
                if (typeof schema[attr] !== 'undefined') {
                    entity[schema[attr].key] = object[attr];
                }
            }
        }

        return entity;
    }

    _resolveBy (schema, by)
    {
        for (let s in schema) {
            if (schema.hasOwnProperty(s)) {
                if (schema[s].key === by) {
                    return s;
                }
            }
        }
    }

}

module.exports = Filesystem;