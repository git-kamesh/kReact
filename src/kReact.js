export class Component {
    constructor( props = {}) {
        this.props = props;
        this.state = null;
    }

    setState(nextState) {
        const isCompat = isObject(this.state) && isObject(nextState);
        const commitState = ()=> this.state = isCompat? Object.assign({}, this.state, nextState) : nextState;
        const prevState = isObject(this.state)? Object.assign({}, this.state) : this.state;

        if( runHook(this, 'shouldComponentUpdate') && this.base ) {
            runHook(this, 'componentWillUpdate', this.props, nextState);
            commitState();
            patch(this.base, this.render());
            runHook(this, 'componentDidUpdate', this.props, prevState);
        } else commitState();
    }

    static render(vnode, parent) {
        if( isClassComponent(vnode) ) {
            let instance = new vnode.type( combineChildrenWithProps( vnode ) );
            runHook(instance, 'componentWillMount');
            instance.base = render( instance.render(), parent);
            instance.base.instance = instance;
            runHook(instance, 'componentDidMount');
            return instance.base;
        } else return render( vnode.type(combineChildrenWithProps( vnode )), parent );
    }

    static patch(dom, vnode, parent=dom.parentNode) {
        if (dom.instance && dom.instance.constructor == vnode.type) {
            runHook(dom.instance, 'componentWillReceiveProps', combineChildrenWithProps( vnode ) );
            dom.instance.props = combineChildrenWithProps( vnode );
            return patch(dom, dom.instance.render(), parent);
        } else if ( isClassComponent(vnode.type) ) {
            const newdom = Component.render(vnode, parent);
            return parent ? (replace(newdom, dom, parent) && newdom) : (newdom);
        } else if ( !isClassComponent(vnode.type) ) return patch(dom, vnode.type( combineChildrenWithProps( vnode ) ), parent);
    }
}

export const createElement = (type, props, ...children ) => ({ type, props: props || {}, children });

export function render(vnode, parent) {
    if( isObject(vnode) ) {
        let dom = isFunction(vnode.type) ? Component.render(vnode, parent) : document.createElement( vnode.type );
        vnode.children.flat(1).map((child)=> render(child, dom));
        !isFunction(vnode.type) && Object.keys(vnode.props).map((key)=> setAttribute(dom, key, vnode.props[key]));
        return mount( dom, parent );
    } else return mount( document.createTextNode(vnode || ''), parent );
}

function patch(dom, vnode, parent=dom.parentNode) {
    if( isObject(vnode) ) {
        if( isTextNode(dom) ) return replace( render(vnode, parent), dom, parent );
        else if( isFunction(vnode.type) ) return Component.patch( dom, vnode, parent);
        else {
            let dom_map = Array.from(dom.childNodes) // Build a key value map to identify dom-node to its equivalent vnode
                .reduce((prev, node, idx)=> ({...prev, [node._idx || `__${idx}`]: node}), {});

            vnode.children.flat(1).map((child, idx)=> {
                let key = (child.props && child.props.key) || `__${idx}`;
                mount( dom_map[key]? patch(dom_map[key], child, dom) : render(child, dom) );
                delete dom_map[key]; // marks dom-vnode pair available by removing from map
            });

            Object.values(dom_map).forEach(element => { // Unmount DOM nodes which are missing in the latest vnodes
                runHook( element.instance, 'componentWillUnmount');
                element.remove();
            });

            !isFunction(vnode.type) && Object.keys(vnode.props).map((key)=> setAttribute(dom, key, vnode.props[key]));
        }
    }
    else if( isTextNode(dom) && dom.textContent != vnode ) return replace( render(vnode, parent), dom, parent );
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
const combineChildrenWithProps = ({ props, children })=> Object.assign({}, props, { children });