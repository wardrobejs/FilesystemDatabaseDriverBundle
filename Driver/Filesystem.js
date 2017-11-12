const Driver = require('@wardrobe/databasebundle').Driver;
let Engine   = require('tingodb')();
const fs     = require('fs-extra');

class Filesystem extends Driver
{
    constructor (container)
    {
        super();
        let database_directory = path.join(container.getParameter('project_dir'), 'var', 'database');

        fs.ensureDirSync(database_directory);

        this.db = new Engine.Db(database_directory, {});

        // cache all schemas
        this.schemas = {};
    }

    find (model, id)
    {
        console.log(model, id);
    }

    findAll ()
    {

    }

    findBy ()
    {

    }

    findOneBy ()
    {

    }

    count ()
    {

    }

    async save (obj, test)
    {
        let collection = this.db.collection(`${obj.name}.db`);

        return await collection.insert(test);
    }

}

module.exports = Filesystem;