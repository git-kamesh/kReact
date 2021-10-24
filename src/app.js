import { Component, render, createElement } from './kReact.js';

class ListItem extends Component {
    constructor(props) {
        super(props);
    }

    componentWillUnmount() {
        console.log(this.props);
    }
    
    render() {
        let { value, idx, handleRemove } = this.props;
        return (
            <li>
                { value } - <span style="color: red;" onClick={()=> handleRemove(idx)}>REMOVE</span>
            </li>
        );
    }
}

function TodoEditor(props) {
    return (
        <div class="todo-editor">
            <input ref={ props.refHandler }/>
            <button onClick={ props.addHandler }>Add Todo</button>
        </div>
    );
}

class TodoList extends Component {
    constructor(props) {
        super(props);

        this.state = {
            todos: ["Hello", "world"]
        };
    }

    addTodo() {
        let todo = this.ipt.value;
        this.setState({ todos: [...this.state.todos, todo]});
        this.ipt.value = '';
    }

    assignInputRef(ref) {
        this.ipt = ref;
    }

    handleRemove(idx) {
        this.setState({ todos: this.state.todos.filter((v, i)=> i != idx) });
    }

    render() {
        return (
            <div>
                <h1>My Todo List</h1>
                <TodoEditor addHandler={this.addTodo.bind(this)} refHandler={this.assignInputRef.bind(this)} />
                <ul>
                    { this.state.todos.map((item, idx)=> <ListItem value={item} idx={idx} handleRemove={ this.handleRemove.bind(this) } />)}
                </ul>
            </div>
        );
    }
}

render(<TodoList />, document.querySelector('#app') );