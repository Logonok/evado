/**
 * @copyright Copyright (c) 2019 Maxim Khorin <maksimovichu@gmail.com>
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class HierarchySolver extends Base {

    static getCircularError (model) {
        return this.wrapClassMessage(`Circular inheritance in ${model.constructor.name}`);
    }

    constructor (config) {
        super({
            // model: new ActiveRecord
            parentAttr: 'parent',
            ...config
        });
    }

    async getDescendantQuery () {
        const descendants = await this.getDescendantIds([this.model.getId()]);
        return this.model.find({[this.model.PK]: descendants}, ...arguments);
    }

    async getParentQuery () {
        let descendants = [];
        let id = this.model.getId();
        if (id) {
            descendants = await this.getDescendantIds([id]);
            descendants.push(id);
        }
        return this.model.find(['NOT IN', this.model.PK, descendants], ...arguments);
    }

    async getDescendantIds (parentIds) {
        const children = await this.model.find({[this.parentAttr]: parentIds}).column(this.model.PK);
        if (children.length === 0) {
            return children;
        }
        if (ArrayHelper.includes(this.model.getId(), children)) {
            throw new Error(this.constructor.getCircularError(this.model));
        }        
        return children.concat(await this.getDescendantIds(children));
    }

    async getAncestors (child) {  // order from root to parent
        child = child || this.model;
        const parent = child.get(this.parentAttr);
        if (!parent) {
            return [];
        }
        const item = await child.findById(parent).with(this.with).one();
        if (!item) {
            return [];
        }
        if (this.model.getId().equals(item.getId())) {
            throw new Error(this.constructor.getCircularError(this.model));
        }        
        const ancestors = await this.getAncestors(item);
        ancestors.push(item);
        return ancestors;
    }

    async getParentSelectItems (query, textKey) {
        let descendants = [];
        let id = this.model.getId();
        if (id ) {
            descendants = await this.getDescendantIds([id]);
            descendants.push(id);
        }
        query = query.andNotIn(this.model.PK, descendants);
        return this.model.constructor.getSelectItemsByQuery(query, this.model.PK, textKey);
    }
};

const ArrayHelper = require('areto/helper/ArrayHelper');