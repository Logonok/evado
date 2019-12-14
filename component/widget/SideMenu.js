/**
 * @copyright Copyright (c) 2019 Maxim Khorin <maksimovichu@gmail.com>
 */
'use strict';

const Base = require('areto/view/Widget');

module.exports = class SideMenu extends Base {

    run () {        
        return this.renderTemplate('_part/nav/sidebarMenu', {});
    }
};