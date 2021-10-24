export class Component {
    constructor( props = {}) {
        this.props = props;
        this.state = null;
    }

    setState(nextState) {
        const isCompat = isObject(this.state) && isObject(nextState);
        const commitState = ()=> isCompat? Object.assign({}, this.state, nextState) : nextState;
        const prevState = isObject(this.state)? Object.assign({}, this.state) : this.state;

        if( runHook(this, 'shouldComponentUpdate') && this.base ) {
            runHook(this, 'componentWillUpdate', this.props, nextState);
            commitState();
            patch(this.base, this.render());
            runHook(this, 'componentDidUpdate', this.props, prevState);
        } else {
            commitState();
        }
    }

    static render(vnode, parent) {
        if( isClassComponent(vnode) ) {
            let instance = new vnode.type( vnode.props );
            runHook(instance, 'componentWillMount');
            instance.base = render( instance.render(), parent);
            instance.base.instance = instance;
            runHook(instance, 'componentDidMount');
            return instance.base;
        } else {
            return render( vnode.type( vnode.props, parent) );
        }
    }

    static patch(dom, vdom, parent=dom.parentNode) {
        const props = Object.assign({}, vdom.props, {children: vdom.children});
        if (dom.instance && dom.instance.constructor == vdom.type) {
            runHook(dom.instance, 'componentWillReceiveProps', props);
            dom.instance.props = props;
            return patch(dom, dom.instance.render(), parent);
        } else if ( isClassComponent(vnode.type) ) {
            const newdom = Component.render(vdom, parent);
            return parent ? (replace(newdom, dom, parent) && newdom) : (newdom);
        } else if ( !isClassComponent(vnode.type) ) {
            return patch(dom, vdom.type(props), parent);
        }
    }
}

export const createElement = (type, props, ...children ) => ({ type, props: props || {}, children });

// render( vnode, parent ):
//      1: Vode --> DOMNode
//      2: DOMNode --> Mount to parent
export function render(vnode, parent) {
    let dom, { type, props, children } = vnode;

    if( isObject(vnode) ) {
        dom = isFunction(type) ? Component.render(vnode, parent) : document.createElement( type );
        children.flat(1).map((child)=> render(child, dom));
        Object.keys(props).map((key)=> setAttribute(dom, key, props[key]));
    } else {
        dom = document.createTextNode(vnode || '');
    }

    return mount( dom, parent );
}

function patch(dom, vnode, parent=dom.parentNode) {
    if( (!isObject(vnode) || isTextNode(dom)) ) {
        return dom.textContent != vnode ? replace( render(vnode), dom, parent ) : dom;
    } else if( isObject(vnode) ) {
        if( isFunction( vnode.type ) ) return Component.patch( dom, vnode, parent );
        else {
            let dom_map = Array.from(dom.childNodes).reduce((prev, cur, idx)=> ({...prev, [cur._idx || `__${idx}`]: cur}), {});
            vnode.children.flat(1).map((child, idx)=> {
                let key = (child.props && child.props.key) || `__${idx}`;
                mount( dom_map[key]? patch( dom_map[key], child ) : render(child), dom);
                delete dom_map[key];
            });
            Object.keys(dom_map).map((key)=> {
                runHook( dom_map[key].instance, 'componentWillUnmount');
                dom_map[key].remove();
            });
            return dom;
        }
    }
}

function setAttribute(dom, key, value) {
    if( key.startsWith('on') && isFunction(value) ) delegateEvent(dom, key, value);
    else if( key == 'ref' && isFunction( value ) ) value( dom );
    else if( ['checked', 'value', 'className', 'key'].includes(key) ) dom[key=='key'? '_idx' :key] = value;
    else dom.setAttribute(key, value);
}

// Utils
const isFunction = ( node ) => typeof node == 'function';
const isObject = ( node ) => typeof node  == 'object';
const isTextNode = ( node ) => node.nodeType == 3;
const replace = (el, dom, parent)=> (parent && parent.replaceChild(el, dom) && el);
const mount = (el, parent)=> parent? parent.appendChild( el ) : el;
const isClassComponent = ( node ) => Component.isPrototypeOf( node.type );
const runHook = (instance, hook, ...args) => isFunction(instance && instance[hook]) ? instance[hook]( ...args) : true;
const delegateEvent = (dom, event, handler)=> {
    event = event.slice(2).toLowerCase();
    dom._evnt = dom._evnt || {};
    dom.removeEventListener(event, dom._evnt[ event ]);
    dom.addEventListener(event, dom._evnt[ event ] = handler);
}