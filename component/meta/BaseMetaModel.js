/**
 * @copyright Copyright (c) 2019 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class BaseMetaModel extends Base {

    getPath () {
        return this.hub.getPath(...arguments);
    }

    getDb () {
        return this.hub.getDb();
    }

    emitEvent (name, data) {
        return this.module.emitEvent(`meta.${this.name}.${name}`, data);
    }

    spawnUser () {
        return this.spawn(this.hub.User, ...arguments);
    }

    splitByModulePrefix () {
        return this.hub.splitByModulePrefix(...arguments);
    }

    async load () {
        this.data = await this.source.load();
    }

    async afterLoad () {
        // after load all meta models
    }

    createSource (data) {
        this.source = this.spawn(data, {meta: this});
    }

    afterDataImport () {}

    exportData () {}

    dropData () {}

    log () {
        CommonHelper.log(this.hub, this.constructor.name, ...arguments);
    }
};

const CommonHelper = require('areto/helper/CommonHelper');