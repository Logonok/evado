/**
 * @copyright Copyright (c) 2019 Maxim Khorin <maksimovichu@gmail.com>
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class Select2 extends Base {

    static getConstants () {
        return {
            MAX_ITEMS: 50
        };
    }

    constructor (config) {
        super({
            // query: [new Query]
            // request: [select2 request]
            ...config
        });
        this.params = this.params || {};
    }

    async getList () {
        const pageSize = parseInt(this.request.pageSize);
        if (isNaN(pageSize) || pageSize < 1 || pageSize > this.MAX_ITEMS) {
            throw new BadRequest(this.wrapClassMessage('Invalid page size'));
        }
        const page = parseInt(this.request.page) || 1;
        if (isNaN(page) || page < 1) {
            throw new BadRequest(this.wrapClassMessage('Invalid page'));
        }
        const text = this.request.search;
        if (typeof text === 'string' && text.length) {
            this.setSearch(text);
        }
        const total = await this.query.count();
        const models = await this.query.offset((page - 1) * pageSize).limit(pageSize).all();
        const items = this.params.getItems
            ? await this.params.getItems.call(this, models, this.params)
            : this.getItems(models);
        return {total, items};
    }

    setSearch (text) {
        const conditions = [];
        this.resolveKeyCondition(text, conditions);
        if (Array.isArray(this.params.searchAttrs)) {
            const stringSearch = this.getStringSearch(text);
            for (const attr of this.params.searchAttrs) {
                if (typeof attr === 'string') {
                    conditions.push({[attr]: stringSearch});
                } else {
                    // TODO parse attr type
                }
            }
        }
        conditions.length
            ? this.query.and(['OR', ...conditions])
            : this.query.where(['FALSE']);
    }

    resolveKeyCondition (text, conditions) {
        const id = this.query.getDb().normalizeId(text);
        if (id) {
            conditions.push({[this.query.model.PK]: id});
        }
    }

    getStringSearch (text) {
        return new RegExp(EscapeHelper.escapeRegex(text), 'i');
    }

    getItems (models) {
        const items = [];
        for (const model of models) {
            items.push({
                id: model.getId(),
                text: model.getTitle()
            });
        }
        return items;
    }
};
module.exports.init();

const EscapeHelper = require('areto/helper/EscapeHelper');
const BadRequest = require('areto/error/BadRequestHttpException');