/**
 * @copyright Copyright (c) 2019 Maxim Khorin <maksimovichu@gmail.com>
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class TestFilter extends Base {

    async execute () {
        return true;  // can assign item to user
    }
};