$(() => {
  const ERRORS = {
    invalidTitle: 'You must enter a title at least 3 characters long.',
    cannotComplete: 'Cannot mark as complete as item has not been created yet!',
  };

  class Todo {
    constructor(json) {
      Object.keys(json).forEach(key => {
        this[key] = json[key];
      });

      if (json.month && json.year) {
        this.due_date = `${json.month}/${json.year.slice(2)}`;
      } else {
        this.due_date = 'No Due Date';
      }
    }

    toggleStatus() {
      this.completed = !this.completed;
    }
  }

  const api = (method="GET", data=null, id='') => {
    return $.ajax({
      url: 'api/todos/' + id,
      method: method,
      data: data,
      contentType: 'application/json',
    });
  }

  const templateData = {
    todos: null,
    todos_by_date: null,
    done: null,
    done_todos_by_date: null,
    selected: null,
    current_section: null,
  };

  const dataManager = {
    add(todo) {
      templateData.todos.push(todo);
    },

    update(id, todo) {
      const index = templateData.todos.findIndex(todo => todo.id === +id);
      templateData.todos.splice(index, 1, todo);
    },

    moveDoneToEnd(list) {
      const undone = list.filter(todo => !todo.completed);
      const done = list.filter(todo => todo.completed);
      return [undone, done].flat();
    },

    setSelectedList() {
      const { group, title } = this.activeList;
      let list;

      if (title === 'All Todos') {
        list = templateData.todos;
      } else if (title === 'Completed') {
        list = templateData.done;
      } else if (group === 'all') {
        list = templateData.todos_by_date[title] || [];
      } else {
        list = templateData.done_todos_by_date[title] || [];
      }

      templateData.selected = this.moveDoneToEnd(list);
    },

    compareDates(first, last) {
      first = new Date(first.year, +first.month - 1);
      last = new Date(last.year, +last.month - 1);
      return first.getTime() - last.getTime();
    },

    sortAllTodosByDate(todos) {
      const withDate = [];
      const noDate = [];

      todos.forEach(todo => {
        todo.month && todo.year ? withDate.push(todo) : noDate.push(todo);
      });

      withDate.sort(this.compareDates);

      return [noDate, withDate].flat();
    },

    sortIntoListsbyDate(todos) {
      const sortedTodos = this.sortAllTodosByDate(todos);
      const lists = {};

      sortedTodos.forEach(todo => {
        const date = todo.due_date;

        lists[date] ? lists[date].push(todo) : lists[date] = [todo];
      });

      return lists;
    },

    setActiveList(e) {
      const $list = $(e.target);
      const selector = $list.closest('header')[0] ? 'header' : 'dl';
      const title = $list.closest(selector).attr('data-title');
      const group = $list.closest('#all')[0] || $list.closest('#completed_items')[0];

      this.activeList = {group: group.id, title: title};
      ui.refresh();
    },

    reset() {
      const todos = templateData.todos;
      const done = todos.filter(todo => todo.completed);

      templateData.todos_by_date = this.sortIntoListsbyDate(todos);
      templateData.done = done;
      templateData.done_todos_by_date = this.sortIntoListsbyDate(done);
      this.setSelectedList();
      templateData.current_section = {
        title: this.activeList.title,
        data: templateData.selected.length,
      };
    },

    init(jsonAry) {
      const todos = jsonAry.map(json => new Todo(json));
      const data = jsonAry.length;

      templateData.todos = todos;
      this.activeList = {group: 'all', title: 'All Todos'}
      this.reset();
      templateData.current_section = {title: 'All Todos', data: data};
      templateData.selected = this.moveDoneToEnd(todos);
    },
  };

  const templates = {
    registerTemplates() {
      const $script = $(this).remove();
      const id = $script.attr('id');

      templates[id] = Handlebars.compile($script.html());

      if ($script.attr('data-type')) {
        Handlebars.registerPartial(id, templates[id]);
      }
    },

    init() {
      $('[type="text/x-handlebars"]').each(this.registerTemplates);
    },
  };

  const modal = {
    toggle() {
      $('#modal_layer, #form_modal').fadeToggle();
    },
  };

  const form = {
    populate(json) {
      $('#title').val(json.title);
      $('#day').val(json.day || 'Day');
      $('#month').val(json.month || 'Month');
      $('#year').val(json.year || 'Year');
      $('textarea').val(json.description);
    },

    showPopulated(e) {
      e.preventDefault();
      e.stopPropagation();
      const id = $(e.target).closest('tr').attr('data-id');

      modal.toggle();
      app.currentMethod = 'PUT';
      app.currentTodoId = id;
      api('GET', null, id).done(json => {
        this.populate(json);
      });
    },

    showEmpty() {
      $('form')[0].reset();
      modal.toggle();
      app.currentMethod = 'POST';
      app.currentTodoId = '';
    },

    serialize() {
      const data = {};
      const $inputs = $('form :input').not('[type="submit"], button');

      $inputs.each(function() {
        const val = $(this).val();
        const invalid = ['Day', 'Month', 'Year'];
        if (val && !invalid.includes(val)) data[this.name] = val;
      });

      return JSON.stringify(data);
    },

    isInvalidCompletion() {
      return app.currentMethod === 'POST';
    },

    completeBtn(e) {
      e.preventDefault();
      if (this.isInvalidCompletion()) return alert(ERRORS.cannotComplete);
      const id = app.currentTodoId;
      const todo = templateData.todos.find(todo => todo.id === +id);

      todo.completed = true;
      api('PUT', JSON.stringify(todo), id).done(() => ui.refresh());
    },

    isInvalidTitle() {
      return $('#title').val().length < 3;
    },

    saveBtn(e) {
      e.preventDefault();
      if (this.isInvalidTitle()) return alert(ERRORS.invalidTitle);
      const method = app.currentMethod;
      const formData = this.serialize();
      const id = app.currentTodoId;

      api(method, formData, id).done(json => {
        const todo = new Todo(json);

        if (method === 'POST') {
          dataManager.add(todo);
          app.init();
        } else {
          dataManager.update(id, todo);
          ui.refresh();
        }
      });
    },
  };

  const ui = {
    highlightActiveList() {
      const { group, title } = dataManager.activeList;
      const selector = `#${group} [data-title="${title}"]`;

      $(selector).addClass('active');
    },

    toggleTodoStatus(e) {
      const id = $(e.target).closest('tr').attr('data-id');
      const todo = templateData.todos.find(todo => todo.id === +id);
      todo.toggleStatus();
      api('PUT', JSON.stringify(todo), id).done(() => this.refresh());
    },

    deleteTodo(e) {
      const id = $(e.target).closest('tr').attr('data-id');
      const index = templateData.todos.findIndex(todo => todo.id === +id);

      api('DELETE', null, id).done(() => {
        templateData.todos.splice(index, 1);
        this.refresh();
      });
    },

    refresh() {
      dataManager.reset();
      this.render();
    },

    render() {
      $('body').html(templates.main_template(templateData));
      this.highlightActiveList();
      app.bindEvents();
    },
  };

  const app = {
    currentMethod: 'POST',
    currentTodoId: '',

    bindEvents() {
      const $allLists = $('#all_todos, #all_lists, #completed_todos, #completed_lists');

      $allLists.click(dataManager.setActiveList.bind(dataManager));
      $('.delete').click(ui.deleteTodo.bind(ui));
      $('.list_item').click(ui.toggleTodoStatus.bind(ui));
      $('#modal_layer').click(modal.toggle.bind(modal));
      $('[for="new_item"]').click(form.showEmpty.bind(form));
      $('.list_item label').click(form.showPopulated.bind(form));
      $('[type="submit"]').click(form.saveBtn.bind(form));
      $('button').click(form.completeBtn.bind(form));
    },

    init() {
      api().done(jsonAry => {
        dataManager.init(jsonAry);
        ui.render();
      });
    },
  };

  templates.init();
  app.init();
});
