/**
 * @copyright Copyright (c) 2019 Maxim Khorin <maksimovichu@gmail.com>
 */
'use strict';

Jam.EnumModelAttr = class ModelAttrEnum extends Jam.ModelAttr {

    init () {
        this.sets = Jam.EnumSet.createSets(this.$attr.data('sets'), this);
        this.select2 = this.$attr.data('select2');
        this.$select = this.$attr.find('select');
        this.$select.change(this.changeValue.bind(this));
        this.model.events.on('change', this.onUpdate.bind(this));
        setTimeout(this.onUpdate.bind(this), 0);
        super.init();
    }

    activate () {
        if (this.canActivate()) {
            if (this.select2) {
                this.$select.select2(this.select2);
            }
            this.activated = true;
        }
    }

    setValue (value) {
        this.$value.val(value);
        this.$select.val(value);
    }

    changeValue () {
        if (this.$value.val() !== this.$select.val()) {
            this.$value.val(this.$select.val()).change();
        }
    }

    onUpdate () {
        if (this.updateItems()) {
            const value = this.getValue();
            this.$select.html(this.build());
            this.$select.val(value);
            if (value !== this.$select.val()) {
                this.$value.val('').change();
            }
        }
    }

    updateItems () {
        const items = Jam.EnumSet.filterItems(this.sets);
        this.items = Jam.ArrayHelper.equals(items, this.items) ? this.items : items;
        return this.items === items;
    }

    build () {
        const category = this.$attr.data('t-sets');
        let content = '<option value></option>';
        for (const item of this.items) {
            const text = Jam.i18n.translate(item.text, category);
            content += `<option value="${item.value}">${text}</option>`;
        }
        return content;
    }
};

Jam.RadioEnumModelAttr = class RadioEnumModelAttr extends Jam.ModelAttr {

    init () {
        super.init();
        this.sets = Jam.EnumSet.createSets(this.$attr.data('sets'), this);
        this.$list = this.$attr.find('.radio-items');
        this.$list.on('change', '[type="radio"]', this.changeValue.bind(this));
        this.model.events.on('change', this.onUpdate.bind(this));
        setTimeout(this.onUpdate.bind(this), 0);
    }

    getRadioItems () {
        return this.$list.find('[type="radio"]');
    }

    getRadioItem (value) {
        return this.getRadioItems().filter(`[value="${value}"]`);
    }

    enable (state) {
        this.$value.attr('disabled', !state);
        this.getRadioItems().attr('disabled', !state);
    }

    setValue (value) {
        this.$value.val(value);
        this.getRadioItems().prop('checked', false);
        this.getRadioItem(value).prop('checked', true);
    }

    changeValue (event) {
        const radio = event.currentTarget;
        if (radio.checked) {
            this.getRadioItems().not(radio).prop('checked', false);
            this.$value.val(radio.value).change();
        }
    }

    onUpdate () {
        if (this.updateItems()) {
            const value = this.getValue();
            this.$list.html(this.build());
            this.getRadioItem(value).length
                ? this.setValue(value)
                : this.$value.val('').change();
        }
    }

    updateItems () {
        const items = Jam.EnumSet.filterItems(this.sets);
        this.items = Jam.ArrayHelper.equals(items, this.items) ? this.items : items;
        return this.items === items;
    }

    build () {
        const category = this.$attr.data('t-sets');
        let result = '';
        for (let {value, text, hint} of this.items) {
            text = Jam.i18n.translate(text, category);
            hint = Jam.i18n.translate(hint, category);
            result += `<label class="radio radio-inline" title="${hint}"><input type="radio" value="${value}">${text}</label>`;
        }
        return result;
    }
};

Jam.EnumSet = class EnumSet {

    static createSets (data, owner) {
        const sets = [];
        if (Array.isArray(data)) {
            for (const item of data) {
                sets.push(new this(item, owner));
            }
        }
        return sets;
    }

    static filterItems (sets) {
        const items = [];
        for (const set of sets) {
            if (set.isActive()) {
                items.push(...set.items);
            }
        }
        return Jam.ArrayHelper.uniqueByKey('value', items);
    }

    constructor (data, owner) {
        this.owner = owner;
        this.items = data.items;
        this.condition = data.condition;
        if (this.condition) {
            this.condition = new Jam.ModelCondition(this.condition, this.owner.model);
        }
    }

    isActive () {
        return !this.condition || this.condition.isValid();
    }
};