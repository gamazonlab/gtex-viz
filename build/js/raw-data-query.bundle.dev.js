var RawDataQuery = (function (exports) {
'use strict';

var EOL = {};
var EOF = {};
var QUOTE = 34;
var NEWLINE = 10;
var RETURN = 13;

function objectConverter(columns) {
  return new Function("d", "return {" + columns.map(function(name, i) {
    return JSON.stringify(name) + ": d[" + i + "]";
  }).join(",") + "}");
}

function customConverter(columns, f) {
  var object = objectConverter(columns);
  return function(row, i) {
    return f(object(row), i, columns);
  };
}

// Compute unique columns in order of discovery.
function inferColumns(rows) {
  var columnSet = Object.create(null),
      columns = [];

  rows.forEach(function(row) {
    for (var column in row) {
      if (!(column in columnSet)) {
        columns.push(columnSet[column] = column);
      }
    }
  });

  return columns;
}

var dsv$1 = function(delimiter) {
  var reFormat = new RegExp("[\"" + delimiter + "\n\r]"),
      DELIMITER = delimiter.charCodeAt(0);

  function parse(text, f) {
    var convert, columns, rows = parseRows(text, function(row, i) {
      if (convert) return convert(row, i - 1);
      columns = row, convert = f ? customConverter(row, f) : objectConverter(row);
    });
    rows.columns = columns || [];
    return rows;
  }

  function parseRows(text, f) {
    var rows = [], // output rows
        N = text.length,
        I = 0, // current character index
        n = 0, // current line number
        t, // current token
        eof = N <= 0, // current token followed by EOF?
        eol = false; // current token followed by EOL?

    // Strip the trailing newline.
    if (text.charCodeAt(N - 1) === NEWLINE) --N;
    if (text.charCodeAt(N - 1) === RETURN) --N;

    function token() {
      if (eof) return EOF;
      if (eol) return eol = false, EOL;

      // Unescape quotes.
      var i, j = I, c;
      if (text.charCodeAt(j) === QUOTE) {
        while (I++ < N && text.charCodeAt(I) !== QUOTE || text.charCodeAt(++I) === QUOTE);
        if ((i = I) >= N) eof = true;
        else if ((c = text.charCodeAt(I++)) === NEWLINE) eol = true;
        else if (c === RETURN) { eol = true; if (text.charCodeAt(I) === NEWLINE) ++I; }
        return text.slice(j + 1, i - 1).replace(/""/g, "\"");
      }

      // Find next delimiter or newline.
      while (I < N) {
        if ((c = text.charCodeAt(i = I++)) === NEWLINE) eol = true;
        else if (c === RETURN) { eol = true; if (text.charCodeAt(I) === NEWLINE) ++I; }
        else if (c !== DELIMITER) continue;
        return text.slice(j, i);
      }

      // Return last token before EOF.
      return eof = true, text.slice(j, N);
    }

    while ((t = token()) !== EOF) {
      var row = [];
      while (t !== EOL && t !== EOF) row.push(t), t = token();
      if (f && (row = f(row, n++)) == null) continue;
      rows.push(row);
    }

    return rows;
  }

  function format(rows, columns) {
    if (columns == null) columns = inferColumns(rows);
    return [columns.map(formatValue).join(delimiter)].concat(rows.map(function(row) {
      return columns.map(function(column) {
        return formatValue(row[column]);
      }).join(delimiter);
    })).join("\n");
  }

  function formatRows(rows) {
    return rows.map(formatRow).join("\n");
  }

  function formatRow(row) {
    return row.map(formatValue).join(delimiter);
  }

  function formatValue(text) {
    return text == null ? ""
        : reFormat.test(text += "") ? "\"" + text.replace(/"/g, "\"\"") + "\""
        : text;
  }

  return {
    parse: parse,
    parseRows: parseRows,
    format: format,
    formatRows: formatRows
  };
};

var csv$1 = dsv$1(",");

var csvParse = csv$1.parse;

var tsv$1 = dsv$1("\t");

var tsvParse = tsv$1.parse;

function responseText(response) {
  if (!response.ok) throw new Error(response.status + " " + response.statusText);
  return response.text();
}

var text = function(input, init) {
  return fetch(input, init).then(responseText);
};

function dsvParse(parse) {
  return function(input, init, row) {
    if (arguments.length === 2 && typeof init === "function") row = init, init = undefined;
    return text(input, init).then(function(response) {
      return parse(response, row);
    });
  };
}

var csv = dsvParse(csvParse);
var tsv = dsvParse(tsvParse);

function responseJson(response) {
  if (!response.ok) throw new Error(response.status + " " + response.statusText);
  return response.json();
}

var json = function(input, init) {
  return fetch(input, init).then(responseJson);
};

var xhtml = "http://www.w3.org/1999/xhtml";

var namespaces = {
  svg: "http://www.w3.org/2000/svg",
  xhtml: xhtml,
  xlink: "http://www.w3.org/1999/xlink",
  xml: "http://www.w3.org/XML/1998/namespace",
  xmlns: "http://www.w3.org/2000/xmlns/"
};

var namespace = function(name) {
  var prefix = name += "", i = prefix.indexOf(":");
  if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
  return namespaces.hasOwnProperty(prefix) ? {space: namespaces[prefix], local: name} : name;
};

function creatorInherit(name) {
  return function() {
    var document = this.ownerDocument,
        uri = this.namespaceURI;
    return uri === xhtml && document.documentElement.namespaceURI === xhtml
        ? document.createElement(name)
        : document.createElementNS(uri, name);
  };
}

function creatorFixed(fullname) {
  return function() {
    return this.ownerDocument.createElementNS(fullname.space, fullname.local);
  };
}

var creator = function(name) {
  var fullname = namespace(name);
  return (fullname.local
      ? creatorFixed
      : creatorInherit)(fullname);
};

function none() {}

var selector = function(selector) {
  return selector == null ? none : function() {
    return this.querySelector(selector);
  };
};

var selection_select = function(select) {
  if (typeof select !== "function") select = selector(select);

  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
      if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
        if ("__data__" in node) subnode.__data__ = node.__data__;
        subgroup[i] = subnode;
      }
    }
  }

  return new Selection(subgroups, this._parents);
};

function empty() {
  return [];
}

var selectorAll = function(selector) {
  return selector == null ? empty : function() {
    return this.querySelectorAll(selector);
  };
};

var selection_selectAll = function(select) {
  if (typeof select !== "function") select = selectorAll(select);

  for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        subgroups.push(select.call(node, node.__data__, i, group));
        parents.push(node);
      }
    }
  }

  return new Selection(subgroups, parents);
};

var matcher = function(selector) {
  return function() {
    return this.matches(selector);
  };
};

if (typeof document !== "undefined") {
  var element = document.documentElement;
  if (!element.matches) {
    var vendorMatches = element.webkitMatchesSelector
        || element.msMatchesSelector
        || element.mozMatchesSelector
        || element.oMatchesSelector;
    matcher = function(selector) {
      return function() {
        return vendorMatches.call(this, selector);
      };
    };
  }
}

var matcher$1 = matcher;

var selection_filter = function(match) {
  if (typeof match !== "function") match = matcher$1(match);

  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
      if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
        subgroup.push(node);
      }
    }
  }

  return new Selection(subgroups, this._parents);
};

var sparse = function(update) {
  return new Array(update.length);
};

var selection_enter = function() {
  return new Selection(this._enter || this._groups.map(sparse), this._parents);
};

function EnterNode(parent, datum) {
  this.ownerDocument = parent.ownerDocument;
  this.namespaceURI = parent.namespaceURI;
  this._next = null;
  this._parent = parent;
  this.__data__ = datum;
}

EnterNode.prototype = {
  constructor: EnterNode,
  appendChild: function(child) { return this._parent.insertBefore(child, this._next); },
  insertBefore: function(child, next) { return this._parent.insertBefore(child, next); },
  querySelector: function(selector) { return this._parent.querySelector(selector); },
  querySelectorAll: function(selector) { return this._parent.querySelectorAll(selector); }
};

var constant = function(x) {
  return function() {
    return x;
  };
};

var keyPrefix = "$"; // Protect against keys like “__proto__”.

function bindIndex(parent, group, enter, update, exit, data) {
  var i = 0,
      node,
      groupLength = group.length,
      dataLength = data.length;

  // Put any non-null nodes that fit into update.
  // Put any null nodes into enter.
  // Put any remaining data into enter.
  for (; i < dataLength; ++i) {
    if (node = group[i]) {
      node.__data__ = data[i];
      update[i] = node;
    } else {
      enter[i] = new EnterNode(parent, data[i]);
    }
  }

  // Put any non-null nodes that don’t fit into exit.
  for (; i < groupLength; ++i) {
    if (node = group[i]) {
      exit[i] = node;
    }
  }
}

function bindKey(parent, group, enter, update, exit, data, key) {
  var i,
      node,
      nodeByKeyValue = {},
      groupLength = group.length,
      dataLength = data.length,
      keyValues = new Array(groupLength),
      keyValue;

  // Compute the key for each node.
  // If multiple nodes have the same key, the duplicates are added to exit.
  for (i = 0; i < groupLength; ++i) {
    if (node = group[i]) {
      keyValues[i] = keyValue = keyPrefix + key.call(node, node.__data__, i, group);
      if (keyValue in nodeByKeyValue) {
        exit[i] = node;
      } else {
        nodeByKeyValue[keyValue] = node;
      }
    }
  }

  // Compute the key for each datum.
  // If there a node associated with this key, join and add it to update.
  // If there is not (or the key is a duplicate), add it to enter.
  for (i = 0; i < dataLength; ++i) {
    keyValue = keyPrefix + key.call(parent, data[i], i, data);
    if (node = nodeByKeyValue[keyValue]) {
      update[i] = node;
      node.__data__ = data[i];
      nodeByKeyValue[keyValue] = null;
    } else {
      enter[i] = new EnterNode(parent, data[i]);
    }
  }

  // Add any remaining nodes that were not bound to data to exit.
  for (i = 0; i < groupLength; ++i) {
    if ((node = group[i]) && (nodeByKeyValue[keyValues[i]] === node)) {
      exit[i] = node;
    }
  }
}

var selection_data = function(value, key) {
  if (!value) {
    data = new Array(this.size()), j = -1;
    this.each(function(d) { data[++j] = d; });
    return data;
  }

  var bind = key ? bindKey : bindIndex,
      parents = this._parents,
      groups = this._groups;

  if (typeof value !== "function") value = constant(value);

  for (var m = groups.length, update = new Array(m), enter = new Array(m), exit = new Array(m), j = 0; j < m; ++j) {
    var parent = parents[j],
        group = groups[j],
        groupLength = group.length,
        data = value.call(parent, parent && parent.__data__, j, parents),
        dataLength = data.length,
        enterGroup = enter[j] = new Array(dataLength),
        updateGroup = update[j] = new Array(dataLength),
        exitGroup = exit[j] = new Array(groupLength);

    bind(parent, group, enterGroup, updateGroup, exitGroup, data, key);

    // Now connect the enter nodes to their following update node, such that
    // appendChild can insert the materialized enter node before this node,
    // rather than at the end of the parent node.
    for (var i0 = 0, i1 = 0, previous, next; i0 < dataLength; ++i0) {
      if (previous = enterGroup[i0]) {
        if (i0 >= i1) i1 = i0 + 1;
        while (!(next = updateGroup[i1]) && ++i1 < dataLength);
        previous._next = next || null;
      }
    }
  }

  update = new Selection(update, parents);
  update._enter = enter;
  update._exit = exit;
  return update;
};

var selection_exit = function() {
  return new Selection(this._exit || this._groups.map(sparse), this._parents);
};

var selection_merge = function(selection$$1) {

  for (var groups0 = this._groups, groups1 = selection$$1._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
    for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
      if (node = group0[i] || group1[i]) {
        merge[i] = node;
      }
    }
  }

  for (; j < m0; ++j) {
    merges[j] = groups0[j];
  }

  return new Selection(merges, this._parents);
};

var selection_order = function() {

  for (var groups = this._groups, j = -1, m = groups.length; ++j < m;) {
    for (var group = groups[j], i = group.length - 1, next = group[i], node; --i >= 0;) {
      if (node = group[i]) {
        if (next && next !== node.nextSibling) next.parentNode.insertBefore(node, next);
        next = node;
      }
    }
  }

  return this;
};

var selection_sort = function(compare) {
  if (!compare) compare = ascending;

  function compareNode(a, b) {
    return a && b ? compare(a.__data__, b.__data__) : !a - !b;
  }

  for (var groups = this._groups, m = groups.length, sortgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, sortgroup = sortgroups[j] = new Array(n), node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        sortgroup[i] = node;
      }
    }
    sortgroup.sort(compareNode);
  }

  return new Selection(sortgroups, this._parents).order();
};

function ascending(a, b) {
  return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
}

var selection_call = function() {
  var callback = arguments[0];
  arguments[0] = this;
  callback.apply(null, arguments);
  return this;
};

var selection_nodes = function() {
  var nodes = new Array(this.size()), i = -1;
  this.each(function() { nodes[++i] = this; });
  return nodes;
};

var selection_node = function() {

  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
    for (var group = groups[j], i = 0, n = group.length; i < n; ++i) {
      var node = group[i];
      if (node) return node;
    }
  }

  return null;
};

var selection_size = function() {
  var size = 0;
  this.each(function() { ++size; });
  return size;
};

var selection_empty = function() {
  return !this.node();
};

var selection_each = function(callback) {

  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
    for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
      if (node = group[i]) callback.call(node, node.__data__, i, group);
    }
  }

  return this;
};

function attrRemove(name) {
  return function() {
    this.removeAttribute(name);
  };
}

function attrRemoveNS(fullname) {
  return function() {
    this.removeAttributeNS(fullname.space, fullname.local);
  };
}

function attrConstant(name, value) {
  return function() {
    this.setAttribute(name, value);
  };
}

function attrConstantNS(fullname, value) {
  return function() {
    this.setAttributeNS(fullname.space, fullname.local, value);
  };
}

function attrFunction(name, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) this.removeAttribute(name);
    else this.setAttribute(name, v);
  };
}

function attrFunctionNS(fullname, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) this.removeAttributeNS(fullname.space, fullname.local);
    else this.setAttributeNS(fullname.space, fullname.local, v);
  };
}

var selection_attr = function(name, value) {
  var fullname = namespace(name);

  if (arguments.length < 2) {
    var node = this.node();
    return fullname.local
        ? node.getAttributeNS(fullname.space, fullname.local)
        : node.getAttribute(fullname);
  }

  return this.each((value == null
      ? (fullname.local ? attrRemoveNS : attrRemove) : (typeof value === "function"
      ? (fullname.local ? attrFunctionNS : attrFunction)
      : (fullname.local ? attrConstantNS : attrConstant)))(fullname, value));
};

var defaultView = function(node) {
  return (node.ownerDocument && node.ownerDocument.defaultView) // node is a Node
      || (node.document && node) // node is a Window
      || node.defaultView; // node is a Document
};

function styleRemove(name) {
  return function() {
    this.style.removeProperty(name);
  };
}

function styleConstant(name, value, priority) {
  return function() {
    this.style.setProperty(name, value, priority);
  };
}

function styleFunction(name, value, priority) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) this.style.removeProperty(name);
    else this.style.setProperty(name, v, priority);
  };
}

var selection_style = function(name, value, priority) {
  return arguments.length > 1
      ? this.each((value == null
            ? styleRemove : typeof value === "function"
            ? styleFunction
            : styleConstant)(name, value, priority == null ? "" : priority))
      : styleValue(this.node(), name);
};

function styleValue(node, name) {
  return node.style.getPropertyValue(name)
      || defaultView(node).getComputedStyle(node, null).getPropertyValue(name);
}

function propertyRemove(name) {
  return function() {
    delete this[name];
  };
}

function propertyConstant(name, value) {
  return function() {
    this[name] = value;
  };
}

function propertyFunction(name, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) delete this[name];
    else this[name] = v;
  };
}

var selection_property = function(name, value) {
  return arguments.length > 1
      ? this.each((value == null
          ? propertyRemove : typeof value === "function"
          ? propertyFunction
          : propertyConstant)(name, value))
      : this.node()[name];
};

function classArray(string) {
  return string.trim().split(/^|\s+/);
}

function classList(node) {
  return node.classList || new ClassList(node);
}

function ClassList(node) {
  this._node = node;
  this._names = classArray(node.getAttribute("class") || "");
}

ClassList.prototype = {
  add: function(name) {
    var i = this._names.indexOf(name);
    if (i < 0) {
      this._names.push(name);
      this._node.setAttribute("class", this._names.join(" "));
    }
  },
  remove: function(name) {
    var i = this._names.indexOf(name);
    if (i >= 0) {
      this._names.splice(i, 1);
      this._node.setAttribute("class", this._names.join(" "));
    }
  },
  contains: function(name) {
    return this._names.indexOf(name) >= 0;
  }
};

function classedAdd(node, names) {
  var list = classList(node), i = -1, n = names.length;
  while (++i < n) list.add(names[i]);
}

function classedRemove(node, names) {
  var list = classList(node), i = -1, n = names.length;
  while (++i < n) list.remove(names[i]);
}

function classedTrue(names) {
  return function() {
    classedAdd(this, names);
  };
}

function classedFalse(names) {
  return function() {
    classedRemove(this, names);
  };
}

function classedFunction(names, value) {
  return function() {
    (value.apply(this, arguments) ? classedAdd : classedRemove)(this, names);
  };
}

var selection_classed = function(name, value) {
  var names = classArray(name + "");

  if (arguments.length < 2) {
    var list = classList(this.node()), i = -1, n = names.length;
    while (++i < n) if (!list.contains(names[i])) return false;
    return true;
  }

  return this.each((typeof value === "function"
      ? classedFunction : value
      ? classedTrue
      : classedFalse)(names, value));
};

function textRemove() {
  this.textContent = "";
}

function textConstant(value) {
  return function() {
    this.textContent = value;
  };
}

function textFunction(value) {
  return function() {
    var v = value.apply(this, arguments);
    this.textContent = v == null ? "" : v;
  };
}

var selection_text = function(value) {
  return arguments.length
      ? this.each(value == null
          ? textRemove : (typeof value === "function"
          ? textFunction
          : textConstant)(value))
      : this.node().textContent;
};

function htmlRemove() {
  this.innerHTML = "";
}

function htmlConstant(value) {
  return function() {
    this.innerHTML = value;
  };
}

function htmlFunction(value) {
  return function() {
    var v = value.apply(this, arguments);
    this.innerHTML = v == null ? "" : v;
  };
}

var selection_html = function(value) {
  return arguments.length
      ? this.each(value == null
          ? htmlRemove : (typeof value === "function"
          ? htmlFunction
          : htmlConstant)(value))
      : this.node().innerHTML;
};

function raise() {
  if (this.nextSibling) this.parentNode.appendChild(this);
}

var selection_raise = function() {
  return this.each(raise);
};

function lower() {
  if (this.previousSibling) this.parentNode.insertBefore(this, this.parentNode.firstChild);
}

var selection_lower = function() {
  return this.each(lower);
};

var selection_append = function(name) {
  var create = typeof name === "function" ? name : creator(name);
  return this.select(function() {
    return this.appendChild(create.apply(this, arguments));
  });
};

function constantNull() {
  return null;
}

var selection_insert = function(name, before) {
  var create = typeof name === "function" ? name : creator(name),
      select = before == null ? constantNull : typeof before === "function" ? before : selector(before);
  return this.select(function() {
    return this.insertBefore(create.apply(this, arguments), select.apply(this, arguments) || null);
  });
};

function remove() {
  var parent = this.parentNode;
  if (parent) parent.removeChild(this);
}

var selection_remove = function() {
  return this.each(remove);
};

function selection_cloneShallow() {
  return this.parentNode.insertBefore(this.cloneNode(false), this.nextSibling);
}

function selection_cloneDeep() {
  return this.parentNode.insertBefore(this.cloneNode(true), this.nextSibling);
}

var selection_clone = function(deep) {
  return this.select(deep ? selection_cloneDeep : selection_cloneShallow);
};

var selection_datum = function(value) {
  return arguments.length
      ? this.property("__data__", value)
      : this.node().__data__;
};

var filterEvents = {};



if (typeof document !== "undefined") {
  var element$1 = document.documentElement;
  if (!("onmouseenter" in element$1)) {
    filterEvents = {mouseenter: "mouseover", mouseleave: "mouseout"};
  }
}

function filterContextListener(listener, index, group) {
  listener = contextListener(listener, index, group);
  return function(event) {
    var related = event.relatedTarget;
    if (!related || (related !== this && !(related.compareDocumentPosition(this) & 8))) {
      listener.call(this, event);
    }
  };
}

function contextListener(listener, index, group) {
  return function(event1) {
    try {
      listener.call(this, this.__data__, index, group);
    } finally {
      
    }
  };
}

function parseTypenames(typenames) {
  return typenames.trim().split(/^|\s+/).map(function(t) {
    var name = "", i = t.indexOf(".");
    if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
    return {type: t, name: name};
  });
}

function onRemove(typename) {
  return function() {
    var on = this.__on;
    if (!on) return;
    for (var j = 0, i = -1, m = on.length, o; j < m; ++j) {
      if (o = on[j], (!typename.type || o.type === typename.type) && o.name === typename.name) {
        this.removeEventListener(o.type, o.listener, o.capture);
      } else {
        on[++i] = o;
      }
    }
    if (++i) on.length = i;
    else delete this.__on;
  };
}

function onAdd(typename, value, capture) {
  var wrap = filterEvents.hasOwnProperty(typename.type) ? filterContextListener : contextListener;
  return function(d, i, group) {
    var on = this.__on, o, listener = wrap(value, i, group);
    if (on) for (var j = 0, m = on.length; j < m; ++j) {
      if ((o = on[j]).type === typename.type && o.name === typename.name) {
        this.removeEventListener(o.type, o.listener, o.capture);
        this.addEventListener(o.type, o.listener = listener, o.capture = capture);
        o.value = value;
        return;
      }
    }
    this.addEventListener(typename.type, listener, capture);
    o = {type: typename.type, name: typename.name, value: value, listener: listener, capture: capture};
    if (!on) this.__on = [o];
    else on.push(o);
  };
}

var selection_on = function(typename, value, capture) {
  var typenames = parseTypenames(typename + ""), i, n = typenames.length, t;

  if (arguments.length < 2) {
    var on = this.node().__on;
    if (on) for (var j = 0, m = on.length, o; j < m; ++j) {
      for (i = 0, o = on[j]; i < n; ++i) {
        if ((t = typenames[i]).type === o.type && t.name === o.name) {
          return o.value;
        }
      }
    }
    return;
  }

  on = value ? onAdd : onRemove;
  if (capture == null) capture = false;
  for (i = 0; i < n; ++i) this.each(on(typenames[i], value, capture));
  return this;
};

function dispatchEvent(node, type, params) {
  var window = defaultView(node),
      event = window.CustomEvent;

  if (typeof event === "function") {
    event = new event(type, params);
  } else {
    event = window.document.createEvent("Event");
    if (params) event.initEvent(type, params.bubbles, params.cancelable), event.detail = params.detail;
    else event.initEvent(type, false, false);
  }

  node.dispatchEvent(event);
}

function dispatchConstant(type, params) {
  return function() {
    return dispatchEvent(this, type, params);
  };
}

function dispatchFunction(type, params) {
  return function() {
    return dispatchEvent(this, type, params.apply(this, arguments));
  };
}

var selection_dispatch = function(type, params) {
  return this.each((typeof params === "function"
      ? dispatchFunction
      : dispatchConstant)(type, params));
};

var root = [null];

function Selection(groups, parents) {
  this._groups = groups;
  this._parents = parents;
}

function selection() {
  return new Selection([[document.documentElement]], root);
}

Selection.prototype = selection.prototype = {
  constructor: Selection,
  select: selection_select,
  selectAll: selection_selectAll,
  filter: selection_filter,
  data: selection_data,
  enter: selection_enter,
  exit: selection_exit,
  merge: selection_merge,
  order: selection_order,
  sort: selection_sort,
  call: selection_call,
  nodes: selection_nodes,
  node: selection_node,
  size: selection_size,
  empty: selection_empty,
  each: selection_each,
  attr: selection_attr,
  style: selection_style,
  property: selection_property,
  classed: selection_classed,
  text: selection_text,
  html: selection_html,
  raise: selection_raise,
  lower: selection_lower,
  append: selection_append,
  insert: selection_insert,
  remove: selection_remove,
  clone: selection_clone,
  datum: selection_datum,
  on: selection_on,
  dispatch: selection_dispatch
};

var select = function(selector) {
  return typeof selector === "string"
      ? new Selection([[document.querySelector(selector)]], [document.documentElement])
      : new Selection([[selector]], root);
};

"use strict";

function getGtexUrls(){
    const host = "https://gtexportal.org/rest/v1/"; // NOTE: top expressed genes are not yet in production
    return {
        // "geneExp": "https://gtexportal.org/rest/v1/dataset/featureExpression?feature=gene&gencode_id=",

        // "sample": host + "dataset/sample?datasetId=gtex_v7&format=json&sort_by=sampleId&sortDir=asc&dataType=",
        "rnaseqCram": "data/rnaseq_cram_files_v7_dbGaP_011516.txt",
        "wgsCram": "data/wgs_cram_files_v7_hg38_dbGaP_011516.txt",
        "sample": "data/gtex.Sample.csv",
        "geneId": host + "reference/geneId?format=json&geneId=",
        "geneExp": host + "expression/geneExpression?datasetId=gtex_v7&gencodeId=",
        "tissue":  host + "dataset/tissueInfo",
        "topInTissueFiltered": host + "expression/topExpressedGenes?datasetId=gtex_v7&filterMtGene=true&sort_by=median&sortDirection=desc&page_size=50&tissueId=",
        "topInTissue": host + "expression/topExpressedGenes?datasetId=gtex_v7&sort_by=median&sortDirection=desc&page_size=50&tissueId=",
        "medExpById": host + "expression/medianGeneExpression?datasetId=gtex_v7&hcluster=true&page_size=10000&gencodeId=",

        "exonExp": host + "expression/medianExonExpression?datasetId=gtex_v7&hcluster=true&gencodeId=",
        "junctionExp": host + "expression/medianJunctionExpression?datasetId=gtex_v7&hcluster=true&gencodeId=",
        "isoformExp": host + "expression/isoformExpression?datasetId=gtex_v7&boxplotDetail=median&gencodeId=",

        "geneModel": host + "reference/collapsedGeneModel?unfiltered=false&release=v7&geneId=",
        "geneModelUnfiltered": host + "reference/collapsedGeneModel?unfiltered=true&release=v7&geneId=",
        "isoform": host + "reference/transcript?release=v7&gencode_id=",

        "liverGeneExp": "data/top50.genes.liver.genomic.median.tpm.json", // top 50 genes in GTEx liver
        "cerebellumGeneExp": "data/top.gtex.cerebellum.genes.median.tpm.tsv",
        "mayoGeneExp": "data/gtex+mayo.top.cerebellum_ad.genes.median.tpm.tsv" // the top 50 genes in Mayo Cerebellum_AD + their gtex expression values
    }
}

/**
 * Parse the genes from GTEx web service
 * @param data {Json}
 * @returns {List} of genes
 */


/**
 * parse the tissues
 * @param data {Json}
 * @returns {List} of tissues
 */
function parseTissues(data){
    const attr = "tissueInfo";
    if(!data.hasOwnProperty(attr)) throw "Fatal Error: parseTissues input error.";
    const tissues = data[attr];

    // sanity check
    ["tissueId", "tissueName", "colorHex"].forEach((d)=>{
        if (!tissues[0].hasOwnProperty(d)) throw "Fatal Error: parseTissue attr not found: " + d;
    });

    return tissues;
}

/**
 * parse the exons
 * @param data {Json}
 * @returns {List} of exons
 */


// export function parseSamples(data){
//     const attr = "sample";
//     if (!data.hasOwnProperty(attr)) throw "Fatal Error: parseSamples input error. " + data;
//     return data[attr];
// }
//


/**
 * parse the junctions
 * @param data
 * @returns {List} of junctions
 * // we do not store junction structure annotations in Mongo
    // so here we use the junction expression web service to retrieve the junction genomic locations
    // assuming that each tissue has the same junctions,
    // to grab all the known junctions of a gene, we only need to look at one tissue
    // here we arbitrarily pick Liver.
 */


/**
 * parse transcript isoforms from the GTEx web service: "reference/transcript?release=v7&gencode_id="
 * @param data {Json}
 * returns a dictionary of transcript exon object lists indexed by ENST IDs
 */


/**
 * parse transcript isoforms
 * @param data {Json} from GTEx web service "reference/transcript?release=v7&gencode_id="
 * returns a list of isoform objects
 */



/**
 * parse final gene model exon expression
 * expression is normalized to reads per kb
 * @param data {JSON} of exon expression web service
 * @param exons {List} of exons with positions
 * @param useLog {boolean} use log2 transformation
 * @param adjust {Number} default 0.01
 * @returns {List} of exon objects
 */


/**
 * Parse junction median read count data
 * @param data {JSON} of the junction expression web service
 * @param useLog {Boolean} perform log transformation
 * @param adjust {Number} for handling 0's when useLog is true
 * @returns {List} of junction objects
 */


/**
 * parse isoform expression
 * @param data
 * @param useLog
 * @param adjust
 * @returns {*}
 */




/**
 * parse median gene expression
 * @param data {Json} with attr medianGeneExpression
 * @param useLog {Boolean} performs log10 transformation
 * @returns {*}
 */


/**
 * Makes the json for the plotly boxplot, no longer in use
 * @param gencodeId {String}: a gencode ID
 * @param data {Object} gene expression API call
 * @param useLog {Boolean}
 * @param color {String}
 * @param xlist {List}: a list of tissue objects {id:String, name:String}
 * @returns {{x: Array, y: Array, name: string, type: string, line: {width: number}, marker: {color: string}}}
 */
// export function makeJsonForPlotly(gencodeId, data, useLog=false, color="grey", xlist){
//
//     // reference: https://plot.ly/javascript/box-plots/
//
//     let lookupTable = parseGeneExpression(gencodeId, data); // constructs the tissue lookup table indexed by tissue ID
//     let x = [];
//     let y = [];
//
//     // xlist: the tissues
//     xlist.forEach((d)=>{
//         // d: a tissue
//         if (lookupTable.exp[d.id]===undefined){
//             // when the gene has no expression data in tissue d,
//             // provide dummy data
//             x = x.concat([d.name]);
//             y = y.concat([-1]);
//         } else {
//             // concatenate a list of the tissue label repeatedly (lookupTable.exp[d].length times) to x
//             // concatenate all the expression values to y
//             // the number of elements in x and y must match
//             x = x.concat(Array(lookupTable.exp[d.id].length).fill(d.name));
//             y = y.concat(lookupTable.exp[d.id]);
//         }
//     });
//     return {
//         x: x,
//         y: y,
//         name: lookupTable.geneSymbol,
//         type: 'box',
//         line: {width:1},
//         marker: {color:color},
//     };
//
// }

/**
 * parse the expression data of a gene for a grouped violin plot
 * @param data {JSON} from GTEx gene expression web service
 * @param colors {Dictionary} the violin color for genes
 */

/**
 * Creates an SVG
 * @param id {String} a DOM element ID that starts with a "#"
 * @param width {Numeric}
 * @param height {Numeric}
 * @param margin {Object} with two attributes: width and height
 * @return {Selection} the d3 selection object of the SVG
 */

/**
 *
 * @param id {String} the parent dom ID
 * @param width {Numeric}
 * @param height {Numeric}
 * @param margin {Object} with attr: left, top
 * @param svgId {String}
 * @returns {*}
 */


/**
 *
 * @param svgObj
 * @param downloadFileName {String}
 * @param tempDownloadDivId {String}
 */

/**
 * A function for parsing the CSS style sheet and including the style properties in the downloadable SVG.
 * @param dom
 * @returns {Element}
 */
function parseCssStyles (dom) {
    var used = "";
    var sheets = document.styleSheets;

    for (var i = 0; i < sheets.length; i++) { // TODO: walk through this block of code

        try {
            if (sheets[i].cssRules == null) continue;
            var rules = sheets[i].cssRules;

            for (var j = 0; j < rules.length; j++) {
                var rule = rules[j];
                if (typeof(rule.style) != "undefined") {
                    var elems;
                    //Some selectors won't work, and most of these don't matter.
                    try {
                        elems = $(dom).find(rule.selectorText);
                    } catch (e) {
                        elems = [];
                    }

                    if (elems.length > 0) {
                        used += rule.selectorText + " { " + rule.style.cssText + " }\n";
                    }
                }
            }
        } catch (e) {
            // In Firefox, if stylesheet originates from a diff domain,
            // trying to access the cssRules will throw a SecurityError.
            // Hence, we must use a try/catch to handle this in Firefox
            if (e.name !== 'SecurityError') throw e;
            continue;
        }
    }

    var s = document.createElement('style');
    s.setAttribute('type', 'text/css');
    s.innerHTML = "<![CDATA[\n" + used + "\n]]>";

    return s;
}

/**
 * Create a toolbar
 * This class uses a lot of jQuery for dom element manipulation
 */

class Toolbar {
    constructor(domId, tooltip=undefined, vertical=false){
        $(`#${domId}`).show(); // if hidden

        // add a new bargroup div to domID with bootstrap button classes
        const btnClasses = vertical?'btn-group-vertical btn-group-sm': 'btn-group btn-group-sm';
        this.bar = $('<div/>').addClass(btnClasses).appendTo(`#${domId}`);
        this.buttons = {};
        this.tooltip = tooltip;
    }

    /**
     * Create a download button
     * @param id {String} the button dom ID
     * @param svgId {String} the SVG dom ID to grab and download
     * @param outfileName {String} the download file name
     * @param cloneId {String} the cloned SVG dom ID
     * @param icon {String} a fontawesome's icon class name
     */
    createDownloadButton(id, svgId, outfileName, cloneId, icon='fa-download'){
        const $button = this.createButton(id, icon);
        select(`#${id}`)
            .on('click', ()=>{
                this.downloadSvg(svgId, outfileName, cloneId);
            })
            .on('mouseover', ()=>{
                this.tooltip.show("Download");
            })
            .on('mouseout', ()=>{
                this.tooltip.hide();
            });
    }

    createResetButton(id, callback, icon='fa-expand-arrows-alt'){
        const $button = this.createButton(id, icon);
        select(`#${id}`)
            .on('click', callback)
            .on('mouseover', ()=>{
                this.tooltip.show("Reset the scales");
            })
            .on('mouseout', ()=>{
                this.tooltip.hide();
            });
    }

    /**
     * create a button to the toolbar
     * @param id {String} the button's id
     * @param icon {String} a fontawesome icon class
     * Dependencies: Bootstrap, jQuery, Fontawesome
     */
    createButton(id, icon='fa-download'){
        const $button = $('<a/>').attr('id', id)
            .addClass('btn btn-default').appendTo(this.bar);
        $('<i/>').addClass(`fa ${icon}`).appendTo($button);
        this.buttons[id] = $button;
        return $button;
    }

    /**
     * attach a tooltip dom with the toolbar
     * @param tooltip {Tooltip}
     */
    attachTooltip(tooltip){
        this.tooltip = tooltip;
    }

    /**
     * Download SVG obj
     * @param svgId {String} the SVG dom ID
     * @param fileName {String} the output file name
     * @param cloneId {String} the temporary dom ID to copy the SVG to
     */
    downloadSvg(svgId, fileName, cloneId){
        // let svgObj = $($($(`${"#" +svgId} svg`))[0]); // complicated jQuery to get to the SVG object
        let svgObj = $($($(`${"#" +svgId}`))[0]);
        var $svgCopy = svgObj.clone()
        .attr("version", "1.1")
        .attr("xmlns", "http://www.w3.org/2000/svg");

        // parse and add all the CSS styling used by the SVG
        var styles = parseCssStyles(svgObj.get());
        $svgCopy.prepend(styles);

        $("#" + cloneId).html('').hide(); // make sure the copyID is invisible
        var svgHtml = $(`#${cloneId}`).append($svgCopy).html();

        var svgBlob = new Blob([svgHtml], {type: "image/svg+xml"});
        saveAs(svgBlob, fileName);

        // clear the temp download div
        $(`#${cloneId}`).html('').hide();
    }
}

'use strict';
/*
TODO:
first build a data matrix with the following structure
{
    col: tissues
    row: data types
    data: [ objects with col and row and value ]
}
 */
/**
 * build the data matrix table
 * @param tableId {String}
 * @param datasetId {String}
 * @param urls
 */

function launch(tableId, datasetId='gtex_v7', urls=getGtexUrls()){
    const promises = [
        // TODO: urls for other datasets
        json(urls.tissue),
        tsv(urls.rnaseqCram),
        tsv(urls.wgsCram),
        tsv(urls.sample),
    ];

    Promise.all(promises)
        .then(function(args){
            let tissues = parseTissues(args[0]);
            const cram = {
                rnaseq: args[1].reduce((a, d)=>{a[d.sample_id]=d; return a;}, {}),
                wgs: args[2].reduce((a, d)=>{a[d.sample_id]=d; return a;}, {})
            };
            let samples = args[3]
                .filter((s)=>s.datasetId==datasetId)
                .map((s)=>{
                    switch (s.dataType){
                        case "WGS": {
                            s.cramFile = cram.wgs[s.sampleId];
                            break;
                        }
                        case "RNASEQ": {
                            s.cramFile = cram.rnaseq[s.sampleId];
                            break;
                        }
                        default:
                            // do nothing
                    }

                    return s;
                });
            const theMatrix = _buildMatrix(datasetId, samples, tissues);

            _renderMatrixTable(tableId, theMatrix);
            _addFilters(tableId, theMatrix, samples, tissues);

        })
        .catch(function(err){console.error(err);});
}

function _addFilters(tableId, mat, samples, tissues){
    const __filter = ()=>{
        const sex = select('input[name="sex"]:checked').node().value;
        const age = select('input[name="age"]:checked').node().value;
        if (sex == 'both' && age == 'all'){
            _renderMatrixTable(tableId, _buildMatrix(mat.datasetId, samples, tissues));
        } else {
            let filteredMat = undefined;
            if (sex == 'both') filteredMat = _buildMatrix(mat.datasetId, samples.filter(s=>s.ageBracket==age), tissues);
            else if (age == 'all') filteredMat = _buildMatrix(mat.datasetId, samples.filter(s=>s.sex==sex), tissues);
            else filteredMat = _buildMatrix(mat.datasetId, samples.filter(s=>s.sex==sex && s.ageBracket==age), tissues);
            _renderMatrixTable(tableId, filteredMat);
        }
    };
    select('#filter-menu').selectAll('input[name="sex"]').on('change', __filter);
    select('#filter-menu').selectAll('input[name="age"]').on('change', __filter);
}

function _buildMatrix(datasetId, samples, tissues){
    const __buildHash = function(dataType){
        return samples.filter((s)=>s.dataType==dataType).reduce((a, d)=>{
            if(a[d.tissueId]===undefined) a[d.tissueId] = 0;
            a[d.tissueId]= a[d.tissueId]+1;
            return a;
        }, {});
    };
    const columns = [
        {
            label: 'RNA-Seq',
            id: 'RNASEQ',
            data: __buildHash('RNASEQ')
        },
        {
            label: 'WES',
            id: 'WES',
            data: __buildHash('WES')
        },
        {
            label: 'WGS',
            id: 'WGS',
            data: __buildHash('WGS')
        }
    ];
    const rows = tissues.map((t)=>{
        t.id = t.tissueId;
        t.label = t.tissueName;
        columns.forEach((col)=>{
            t[col.id] = col.data[t.id] || undefined;
        });
        return t;
    });

    return {
        datasetId: datasetId,
        X: rows,
        Y: columns,
        data: samples
    };
}


/**
 * Render the matrix in an HTML table format
 * @param tableId {String} the DOM ID of the table
 * @param mat {Object} of attr: datasetId, X--a list of x objects, Y--a list of y objects
 * @private
 */
function _renderMatrixTable(tableId, mat){
    const dataset = {
        'gtex_v7': {
            label:'GTEX V7',
            bgcolor: '#2a718b'
        }
    };
    // rendering the column labels
    const theTable = select(`#${tableId}`);
    theTable.select('thead').selectAll('th')
        .data([{label:"", id:""}].concat(mat.Y))
        .enter()
        .append('th')
        .attr('scope', 'col')
        .attr('class', (d, i)=>d.id==""?'':`y${i-1}`)
        .text((d)=>d.label);

    theTable.select('.table-label').selectAll('*').remove();
    theTable.select('.table-label').append('th')
        .attr('colspan', mat.Y.length + 1)
        .text(dataset[mat.datasetId].label)
        .style('background-color',dataset[mat.datasetId].bgcolor);

    _renderCounts(theTable.select('tbody'), mat);
    _addClickEvents(tableId);
    _addToolbar(tableId, mat);
}

function _renderCounts(tbody, mat){
    tbody.selectAll('.data-row').remove();
    const theRows = tbody.selectAll('.data-row')
        .data(mat.X)
        .enter()
        .append('tr')
        .classed('data-row', true);

    // rendering the row label
    theRows.append('th')
        .attr('scope', 'row')
        .attr('class', (d, i)=>`x${i}`)
        .text((d)=>d.label);

    mat.Y.forEach((y, j)=>{
        theRows.append('td')
            .attr('class', (d, i)=>`x${i} y${j}`)
            .text((d)=>d[y.id]||'');
    });

}

/**
 * Add customized column, row and cell click events
 * @param tableId {String} the dom ID of the table
 * @private
 */
function _addClickEvents(tableId){
    const theCells = select(`#${tableId}`).select('tbody').selectAll('td');

    // column labels
    select(`#${tableId}`).select('thead').selectAll('th')
        .style('cursor', 'pointer')
        .on('click', function(){
            // toggle the selection
           const theColumn = select(this).attr('class');
           if (select(this).attr('scope') == 'col') {
               select(this).attr('scope', 'selected');
               theCells.filter(`.${theColumn}`).classed('selected', true);
           } else {
               select(this).attr('scope', 'col');
               theCells.filter(`.${theColumn}`).classed('selected', false);
           }
           // console.log(theColumn);
        });

    // row labels
    select(`#${tableId}`).select('tbody').selectAll('th')
        .style('cursor', 'pointer')
        .on('click', function(){
           const theRow = select(this).attr('class');
           if (select(this).attr('scope') == 'row') {
               select(this).attr('scope', 'selected');
               theCells.filter(`.${theRow}`).classed('selected', true);
           } else {
               select(this).attr('scope', 'row');
               theCells.filter(`.${theRow}`).classed('selected', false);
           }
           // console.log(theRow);
        });


    // data cells
    theCells.style('cursor', 'pointer')
        .on('click', function(){
            // toggle the selected class assignment
            select(this).classed('selected', !select(this).classed('selected'));
        });
}

function _addToolbar(tableId, mat){
    // TODO: get rid of hard-coded dom IDs
    const theCells = select(`#${tableId}`).select('tbody').selectAll('td');
    select('#matrix-table-toolbar').selectAll('*').remove();
    const toolbar = new Toolbar('matrix-table-toolbar', undefined, true);
    toolbar.createButton('sample-download');
    toolbar.createButton('send-to-firecloud', 'fa-cloud-upload-alt');

    select('#sample-download')
        .style('cursor', 'pointer')
        .on('click', function(){
            let cells = theCells.filter(`.selected`);
            if (cells.empty()) alert('You have not selected any samples to download.');
            else {
                cells.each(function(d){
                    const marker = select(this).attr('class').split(' ').filter((c)=>{return c!='selected'});
                    const x = mat.X[parseInt(marker[0].replace('x', ''))].id;
                    const y = mat.Y[parseInt(marker[1].replace('y', ''))].id;
                    console.log('Download ' + x + ' : '+ y);
                    const selectedSamples = mat.data.filter((s)=>s.dataType==y&&s.tissueId==x);
                    console.log(selectedSamples);
                });
            }

        });

    select('#send-to-firecloud')
        .style('cursor', 'pointer')
        .on('click', function(){
            alert('Send to FireCloud. To be implemented.');
        });
}

exports.launch = launch;

return exports;

}({}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmF3LWRhdGEtcXVlcnkuYnVuZGxlLmRldi5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWRzdi9zcmMvZHN2LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWRzdi9zcmMvY3N2LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWRzdi9zcmMvdHN2LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWZldGNoL3NyYy90ZXh0LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLWZldGNoL3NyYy9kc3YuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtZmV0Y2gvc3JjL2pzb24uanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9uYW1lc3BhY2VzLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvbmFtZXNwYWNlLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvY3JlYXRvci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdG9yLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL3NlbGVjdC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdG9yQWxsLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL3NlbGVjdEFsbC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL21hdGNoZXIuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vZmlsdGVyLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL3NwYXJzZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9lbnRlci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL2NvbnN0YW50LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2RhdGEuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vZXhpdC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9tZXJnZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9vcmRlci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9zb3J0LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2NhbGwuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vbm9kZXMuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vbm9kZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9zaXplLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2VtcHR5LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2VhY2guanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vYXR0ci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3dpbmRvdy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9zdHlsZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9wcm9wZXJ0eS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9jbGFzc2VkLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL3RleHQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vaHRtbC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9yYWlzZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9sb3dlci5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9hcHBlbmQuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vaW5zZXJ0LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL3JlbW92ZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9jbG9uZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9kYXR1bS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9vbi5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9kaXNwYXRjaC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9pbmRleC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdC5qcyIsIi4uLy4uL3NyYy9zY3JpcHRzL21vZHVsZXMvZ3RleERhdGFQYXJzZXIuanMiLCIuLi8uLi9zcmMvc2NyaXB0cy9tb2R1bGVzL3V0aWxzLmpzIiwiLi4vLi4vc3JjL3NjcmlwdHMvbW9kdWxlcy9Ub29sYmFyLmpzIiwiLi4vLi4vc3JjL3NjcmlwdHMvUmF3RGF0YVF1ZXJ5LmpzIl0sInNvdXJjZXNDb250ZW50IjpbInZhciBFT0wgPSB7fSxcbiAgICBFT0YgPSB7fSxcbiAgICBRVU9URSA9IDM0LFxuICAgIE5FV0xJTkUgPSAxMCxcbiAgICBSRVRVUk4gPSAxMztcblxuZnVuY3Rpb24gb2JqZWN0Q29udmVydGVyKGNvbHVtbnMpIHtcbiAgcmV0dXJuIG5ldyBGdW5jdGlvbihcImRcIiwgXCJyZXR1cm4ge1wiICsgY29sdW1ucy5tYXAoZnVuY3Rpb24obmFtZSwgaSkge1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShuYW1lKSArIFwiOiBkW1wiICsgaSArIFwiXVwiO1xuICB9KS5qb2luKFwiLFwiKSArIFwifVwiKTtcbn1cblxuZnVuY3Rpb24gY3VzdG9tQ29udmVydGVyKGNvbHVtbnMsIGYpIHtcbiAgdmFyIG9iamVjdCA9IG9iamVjdENvbnZlcnRlcihjb2x1bW5zKTtcbiAgcmV0dXJuIGZ1bmN0aW9uKHJvdywgaSkge1xuICAgIHJldHVybiBmKG9iamVjdChyb3cpLCBpLCBjb2x1bW5zKTtcbiAgfTtcbn1cblxuLy8gQ29tcHV0ZSB1bmlxdWUgY29sdW1ucyBpbiBvcmRlciBvZiBkaXNjb3ZlcnkuXG5mdW5jdGlvbiBpbmZlckNvbHVtbnMocm93cykge1xuICB2YXIgY29sdW1uU2V0ID0gT2JqZWN0LmNyZWF0ZShudWxsKSxcbiAgICAgIGNvbHVtbnMgPSBbXTtcblxuICByb3dzLmZvckVhY2goZnVuY3Rpb24ocm93KSB7XG4gICAgZm9yICh2YXIgY29sdW1uIGluIHJvdykge1xuICAgICAgaWYgKCEoY29sdW1uIGluIGNvbHVtblNldCkpIHtcbiAgICAgICAgY29sdW1ucy5wdXNoKGNvbHVtblNldFtjb2x1bW5dID0gY29sdW1uKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBjb2x1bW5zO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihkZWxpbWl0ZXIpIHtcbiAgdmFyIHJlRm9ybWF0ID0gbmV3IFJlZ0V4cChcIltcXFwiXCIgKyBkZWxpbWl0ZXIgKyBcIlxcblxccl1cIiksXG4gICAgICBERUxJTUlURVIgPSBkZWxpbWl0ZXIuY2hhckNvZGVBdCgwKTtcblxuICBmdW5jdGlvbiBwYXJzZSh0ZXh0LCBmKSB7XG4gICAgdmFyIGNvbnZlcnQsIGNvbHVtbnMsIHJvd3MgPSBwYXJzZVJvd3ModGV4dCwgZnVuY3Rpb24ocm93LCBpKSB7XG4gICAgICBpZiAoY29udmVydCkgcmV0dXJuIGNvbnZlcnQocm93LCBpIC0gMSk7XG4gICAgICBjb2x1bW5zID0gcm93LCBjb252ZXJ0ID0gZiA/IGN1c3RvbUNvbnZlcnRlcihyb3csIGYpIDogb2JqZWN0Q29udmVydGVyKHJvdyk7XG4gICAgfSk7XG4gICAgcm93cy5jb2x1bW5zID0gY29sdW1ucyB8fCBbXTtcbiAgICByZXR1cm4gcm93cztcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlUm93cyh0ZXh0LCBmKSB7XG4gICAgdmFyIHJvd3MgPSBbXSwgLy8gb3V0cHV0IHJvd3NcbiAgICAgICAgTiA9IHRleHQubGVuZ3RoLFxuICAgICAgICBJID0gMCwgLy8gY3VycmVudCBjaGFyYWN0ZXIgaW5kZXhcbiAgICAgICAgbiA9IDAsIC8vIGN1cnJlbnQgbGluZSBudW1iZXJcbiAgICAgICAgdCwgLy8gY3VycmVudCB0b2tlblxuICAgICAgICBlb2YgPSBOIDw9IDAsIC8vIGN1cnJlbnQgdG9rZW4gZm9sbG93ZWQgYnkgRU9GP1xuICAgICAgICBlb2wgPSBmYWxzZTsgLy8gY3VycmVudCB0b2tlbiBmb2xsb3dlZCBieSBFT0w/XG5cbiAgICAvLyBTdHJpcCB0aGUgdHJhaWxpbmcgbmV3bGluZS5cbiAgICBpZiAodGV4dC5jaGFyQ29kZUF0KE4gLSAxKSA9PT0gTkVXTElORSkgLS1OO1xuICAgIGlmICh0ZXh0LmNoYXJDb2RlQXQoTiAtIDEpID09PSBSRVRVUk4pIC0tTjtcblxuICAgIGZ1bmN0aW9uIHRva2VuKCkge1xuICAgICAgaWYgKGVvZikgcmV0dXJuIEVPRjtcbiAgICAgIGlmIChlb2wpIHJldHVybiBlb2wgPSBmYWxzZSwgRU9MO1xuXG4gICAgICAvLyBVbmVzY2FwZSBxdW90ZXMuXG4gICAgICB2YXIgaSwgaiA9IEksIGM7XG4gICAgICBpZiAodGV4dC5jaGFyQ29kZUF0KGopID09PSBRVU9URSkge1xuICAgICAgICB3aGlsZSAoSSsrIDwgTiAmJiB0ZXh0LmNoYXJDb2RlQXQoSSkgIT09IFFVT1RFIHx8IHRleHQuY2hhckNvZGVBdCgrK0kpID09PSBRVU9URSk7XG4gICAgICAgIGlmICgoaSA9IEkpID49IE4pIGVvZiA9IHRydWU7XG4gICAgICAgIGVsc2UgaWYgKChjID0gdGV4dC5jaGFyQ29kZUF0KEkrKykpID09PSBORVdMSU5FKSBlb2wgPSB0cnVlO1xuICAgICAgICBlbHNlIGlmIChjID09PSBSRVRVUk4pIHsgZW9sID0gdHJ1ZTsgaWYgKHRleHQuY2hhckNvZGVBdChJKSA9PT0gTkVXTElORSkgKytJOyB9XG4gICAgICAgIHJldHVybiB0ZXh0LnNsaWNlKGogKyAxLCBpIC0gMSkucmVwbGFjZSgvXCJcIi9nLCBcIlxcXCJcIik7XG4gICAgICB9XG5cbiAgICAgIC8vIEZpbmQgbmV4dCBkZWxpbWl0ZXIgb3IgbmV3bGluZS5cbiAgICAgIHdoaWxlIChJIDwgTikge1xuICAgICAgICBpZiAoKGMgPSB0ZXh0LmNoYXJDb2RlQXQoaSA9IEkrKykpID09PSBORVdMSU5FKSBlb2wgPSB0cnVlO1xuICAgICAgICBlbHNlIGlmIChjID09PSBSRVRVUk4pIHsgZW9sID0gdHJ1ZTsgaWYgKHRleHQuY2hhckNvZGVBdChJKSA9PT0gTkVXTElORSkgKytJOyB9XG4gICAgICAgIGVsc2UgaWYgKGMgIT09IERFTElNSVRFUikgY29udGludWU7XG4gICAgICAgIHJldHVybiB0ZXh0LnNsaWNlKGosIGkpO1xuICAgICAgfVxuXG4gICAgICAvLyBSZXR1cm4gbGFzdCB0b2tlbiBiZWZvcmUgRU9GLlxuICAgICAgcmV0dXJuIGVvZiA9IHRydWUsIHRleHQuc2xpY2UoaiwgTik7XG4gICAgfVxuXG4gICAgd2hpbGUgKCh0ID0gdG9rZW4oKSkgIT09IEVPRikge1xuICAgICAgdmFyIHJvdyA9IFtdO1xuICAgICAgd2hpbGUgKHQgIT09IEVPTCAmJiB0ICE9PSBFT0YpIHJvdy5wdXNoKHQpLCB0ID0gdG9rZW4oKTtcbiAgICAgIGlmIChmICYmIChyb3cgPSBmKHJvdywgbisrKSkgPT0gbnVsbCkgY29udGludWU7XG4gICAgICByb3dzLnB1c2gocm93KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcm93cztcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdChyb3dzLCBjb2x1bW5zKSB7XG4gICAgaWYgKGNvbHVtbnMgPT0gbnVsbCkgY29sdW1ucyA9IGluZmVyQ29sdW1ucyhyb3dzKTtcbiAgICByZXR1cm4gW2NvbHVtbnMubWFwKGZvcm1hdFZhbHVlKS5qb2luKGRlbGltaXRlcildLmNvbmNhdChyb3dzLm1hcChmdW5jdGlvbihyb3cpIHtcbiAgICAgIHJldHVybiBjb2x1bW5zLm1hcChmdW5jdGlvbihjb2x1bW4pIHtcbiAgICAgICAgcmV0dXJuIGZvcm1hdFZhbHVlKHJvd1tjb2x1bW5dKTtcbiAgICAgIH0pLmpvaW4oZGVsaW1pdGVyKTtcbiAgICB9KSkuam9pbihcIlxcblwiKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdFJvd3Mocm93cykge1xuICAgIHJldHVybiByb3dzLm1hcChmb3JtYXRSb3cpLmpvaW4oXCJcXG5cIik7XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXRSb3cocm93KSB7XG4gICAgcmV0dXJuIHJvdy5tYXAoZm9ybWF0VmFsdWUpLmpvaW4oZGVsaW1pdGVyKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdFZhbHVlKHRleHQpIHtcbiAgICByZXR1cm4gdGV4dCA9PSBudWxsID8gXCJcIlxuICAgICAgICA6IHJlRm9ybWF0LnRlc3QodGV4dCArPSBcIlwiKSA/IFwiXFxcIlwiICsgdGV4dC5yZXBsYWNlKC9cIi9nLCBcIlxcXCJcXFwiXCIpICsgXCJcXFwiXCJcbiAgICAgICAgOiB0ZXh0O1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBwYXJzZTogcGFyc2UsXG4gICAgcGFyc2VSb3dzOiBwYXJzZVJvd3MsXG4gICAgZm9ybWF0OiBmb3JtYXQsXG4gICAgZm9ybWF0Um93czogZm9ybWF0Um93c1xuICB9O1xufVxuIiwiaW1wb3J0IGRzdiBmcm9tIFwiLi9kc3ZcIjtcblxudmFyIGNzdiA9IGRzdihcIixcIik7XG5cbmV4cG9ydCB2YXIgY3N2UGFyc2UgPSBjc3YucGFyc2U7XG5leHBvcnQgdmFyIGNzdlBhcnNlUm93cyA9IGNzdi5wYXJzZVJvd3M7XG5leHBvcnQgdmFyIGNzdkZvcm1hdCA9IGNzdi5mb3JtYXQ7XG5leHBvcnQgdmFyIGNzdkZvcm1hdFJvd3MgPSBjc3YuZm9ybWF0Um93cztcbiIsImltcG9ydCBkc3YgZnJvbSBcIi4vZHN2XCI7XG5cbnZhciB0c3YgPSBkc3YoXCJcXHRcIik7XG5cbmV4cG9ydCB2YXIgdHN2UGFyc2UgPSB0c3YucGFyc2U7XG5leHBvcnQgdmFyIHRzdlBhcnNlUm93cyA9IHRzdi5wYXJzZVJvd3M7XG5leHBvcnQgdmFyIHRzdkZvcm1hdCA9IHRzdi5mb3JtYXQ7XG5leHBvcnQgdmFyIHRzdkZvcm1hdFJvd3MgPSB0c3YuZm9ybWF0Um93cztcbiIsImZ1bmN0aW9uIHJlc3BvbnNlVGV4dChyZXNwb25zZSkge1xuICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyBuZXcgRXJyb3IocmVzcG9uc2Uuc3RhdHVzICsgXCIgXCIgKyByZXNwb25zZS5zdGF0dXNUZXh0KTtcbiAgcmV0dXJuIHJlc3BvbnNlLnRleHQoKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oaW5wdXQsIGluaXQpIHtcbiAgcmV0dXJuIGZldGNoKGlucHV0LCBpbml0KS50aGVuKHJlc3BvbnNlVGV4dCk7XG59XG4iLCJpbXBvcnQge2NzdlBhcnNlLCBkc3ZGb3JtYXQsIHRzdlBhcnNlfSBmcm9tIFwiZDMtZHN2XCI7XG5pbXBvcnQgdGV4dCBmcm9tIFwiLi90ZXh0XCI7XG5cbmZ1bmN0aW9uIGRzdlBhcnNlKHBhcnNlKSB7XG4gIHJldHVybiBmdW5jdGlvbihpbnB1dCwgaW5pdCwgcm93KSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIgJiYgdHlwZW9mIGluaXQgPT09IFwiZnVuY3Rpb25cIikgcm93ID0gaW5pdCwgaW5pdCA9IHVuZGVmaW5lZDtcbiAgICByZXR1cm4gdGV4dChpbnB1dCwgaW5pdCkudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgcmV0dXJuIHBhcnNlKHJlc3BvbnNlLCByb3cpO1xuICAgIH0pO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBkc3YoZGVsaW1pdGVyLCBpbnB1dCwgaW5pdCwgcm93KSB7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAzICYmIHR5cGVvZiBpbml0ID09PSBcImZ1bmN0aW9uXCIpIHJvdyA9IGluaXQsIGluaXQgPSB1bmRlZmluZWQ7XG4gIHZhciBmb3JtYXQgPSBkc3ZGb3JtYXQoZGVsaW1pdGVyKTtcbiAgcmV0dXJuIHRleHQoaW5wdXQsIGluaXQpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICByZXR1cm4gZm9ybWF0LnBhcnNlKHJlc3BvbnNlLCByb3cpO1xuICB9KTtcbn1cblxuZXhwb3J0IHZhciBjc3YgPSBkc3ZQYXJzZShjc3ZQYXJzZSk7XG5leHBvcnQgdmFyIHRzdiA9IGRzdlBhcnNlKHRzdlBhcnNlKTtcbiIsImZ1bmN0aW9uIHJlc3BvbnNlSnNvbihyZXNwb25zZSkge1xuICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyBuZXcgRXJyb3IocmVzcG9uc2Uuc3RhdHVzICsgXCIgXCIgKyByZXNwb25zZS5zdGF0dXNUZXh0KTtcbiAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oaW5wdXQsIGluaXQpIHtcbiAgcmV0dXJuIGZldGNoKGlucHV0LCBpbml0KS50aGVuKHJlc3BvbnNlSnNvbik7XG59XG4iLCJleHBvcnQgdmFyIHhodG1sID0gXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sXCI7XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgc3ZnOiBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIsXG4gIHhodG1sOiB4aHRtbCxcbiAgeGxpbms6IFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1wiLFxuICB4bWw6IFwiaHR0cDovL3d3dy53My5vcmcvWE1MLzE5OTgvbmFtZXNwYWNlXCIsXG4gIHhtbG5zOiBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAveG1sbnMvXCJcbn07XG4iLCJpbXBvcnQgbmFtZXNwYWNlcyBmcm9tIFwiLi9uYW1lc3BhY2VzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5hbWUpIHtcbiAgdmFyIHByZWZpeCA9IG5hbWUgKz0gXCJcIiwgaSA9IHByZWZpeC5pbmRleE9mKFwiOlwiKTtcbiAgaWYgKGkgPj0gMCAmJiAocHJlZml4ID0gbmFtZS5zbGljZSgwLCBpKSkgIT09IFwieG1sbnNcIikgbmFtZSA9IG5hbWUuc2xpY2UoaSArIDEpO1xuICByZXR1cm4gbmFtZXNwYWNlcy5oYXNPd25Qcm9wZXJ0eShwcmVmaXgpID8ge3NwYWNlOiBuYW1lc3BhY2VzW3ByZWZpeF0sIGxvY2FsOiBuYW1lfSA6IG5hbWU7XG59XG4iLCJpbXBvcnQgbmFtZXNwYWNlIGZyb20gXCIuL25hbWVzcGFjZVwiO1xuaW1wb3J0IHt4aHRtbH0gZnJvbSBcIi4vbmFtZXNwYWNlc1wiO1xuXG5mdW5jdGlvbiBjcmVhdG9ySW5oZXJpdChuYW1lKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgZG9jdW1lbnQgPSB0aGlzLm93bmVyRG9jdW1lbnQsXG4gICAgICAgIHVyaSA9IHRoaXMubmFtZXNwYWNlVVJJO1xuICAgIHJldHVybiB1cmkgPT09IHhodG1sICYmIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5uYW1lc3BhY2VVUkkgPT09IHhodG1sXG4gICAgICAgID8gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChuYW1lKVxuICAgICAgICA6IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyh1cmksIG5hbWUpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBjcmVhdG9yRml4ZWQoZnVsbG5hbWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLm93bmVyRG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKGZ1bGxuYW1lLnNwYWNlLCBmdWxsbmFtZS5sb2NhbCk7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5hbWUpIHtcbiAgdmFyIGZ1bGxuYW1lID0gbmFtZXNwYWNlKG5hbWUpO1xuICByZXR1cm4gKGZ1bGxuYW1lLmxvY2FsXG4gICAgICA/IGNyZWF0b3JGaXhlZFxuICAgICAgOiBjcmVhdG9ySW5oZXJpdCkoZnVsbG5hbWUpO1xufVxuIiwiZnVuY3Rpb24gbm9uZSgpIHt9XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gIHJldHVybiBzZWxlY3RvciA9PSBudWxsID8gbm9uZSA6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICB9O1xufVxuIiwiaW1wb3J0IHtTZWxlY3Rpb259IGZyb20gXCIuL2luZGV4XCI7XG5pbXBvcnQgc2VsZWN0b3IgZnJvbSBcIi4uL3NlbGVjdG9yXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHNlbGVjdCkge1xuICBpZiAodHlwZW9mIHNlbGVjdCAhPT0gXCJmdW5jdGlvblwiKSBzZWxlY3QgPSBzZWxlY3RvcihzZWxlY3QpO1xuXG4gIGZvciAodmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcywgbSA9IGdyb3Vwcy5sZW5ndGgsIHN1Ymdyb3VwcyA9IG5ldyBBcnJheShtKSwgaiA9IDA7IGogPCBtOyArK2opIHtcbiAgICBmb3IgKHZhciBncm91cCA9IGdyb3Vwc1tqXSwgbiA9IGdyb3VwLmxlbmd0aCwgc3ViZ3JvdXAgPSBzdWJncm91cHNbal0gPSBuZXcgQXJyYXkobiksIG5vZGUsIHN1Ym5vZGUsIGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAoKG5vZGUgPSBncm91cFtpXSkgJiYgKHN1Ym5vZGUgPSBzZWxlY3QuY2FsbChub2RlLCBub2RlLl9fZGF0YV9fLCBpLCBncm91cCkpKSB7XG4gICAgICAgIGlmIChcIl9fZGF0YV9fXCIgaW4gbm9kZSkgc3Vibm9kZS5fX2RhdGFfXyA9IG5vZGUuX19kYXRhX187XG4gICAgICAgIHN1Ymdyb3VwW2ldID0gc3Vibm9kZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmV3IFNlbGVjdGlvbihzdWJncm91cHMsIHRoaXMuX3BhcmVudHMpO1xufVxuIiwiZnVuY3Rpb24gZW1wdHkoKSB7XG4gIHJldHVybiBbXTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oc2VsZWN0b3IpIHtcbiAgcmV0dXJuIHNlbGVjdG9yID09IG51bGwgPyBlbXB0eSA6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuICB9O1xufVxuIiwiaW1wb3J0IHtTZWxlY3Rpb259IGZyb20gXCIuL2luZGV4XCI7XG5pbXBvcnQgc2VsZWN0b3JBbGwgZnJvbSBcIi4uL3NlbGVjdG9yQWxsXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHNlbGVjdCkge1xuICBpZiAodHlwZW9mIHNlbGVjdCAhPT0gXCJmdW5jdGlvblwiKSBzZWxlY3QgPSBzZWxlY3RvckFsbChzZWxlY3QpO1xuXG4gIGZvciAodmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcywgbSA9IGdyb3Vwcy5sZW5ndGgsIHN1Ymdyb3VwcyA9IFtdLCBwYXJlbnRzID0gW10sIGogPSAwOyBqIDwgbTsgKytqKSB7XG4gICAgZm9yICh2YXIgZ3JvdXAgPSBncm91cHNbal0sIG4gPSBncm91cC5sZW5ndGgsIG5vZGUsIGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAobm9kZSA9IGdyb3VwW2ldKSB7XG4gICAgICAgIHN1Ymdyb3Vwcy5wdXNoKHNlbGVjdC5jYWxsKG5vZGUsIG5vZGUuX19kYXRhX18sIGksIGdyb3VwKSk7XG4gICAgICAgIHBhcmVudHMucHVzaChub2RlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmV3IFNlbGVjdGlvbihzdWJncm91cHMsIHBhcmVudHMpO1xufVxuIiwidmFyIG1hdGNoZXIgPSBmdW5jdGlvbihzZWxlY3Rvcikge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMubWF0Y2hlcyhzZWxlY3Rvcik7XG4gIH07XG59O1xuXG5pZiAodHlwZW9mIGRvY3VtZW50ICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gIHZhciBlbGVtZW50ID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuICBpZiAoIWVsZW1lbnQubWF0Y2hlcykge1xuICAgIHZhciB2ZW5kb3JNYXRjaGVzID0gZWxlbWVudC53ZWJraXRNYXRjaGVzU2VsZWN0b3JcbiAgICAgICAgfHwgZWxlbWVudC5tc01hdGNoZXNTZWxlY3RvclxuICAgICAgICB8fCBlbGVtZW50Lm1vek1hdGNoZXNTZWxlY3RvclxuICAgICAgICB8fCBlbGVtZW50Lm9NYXRjaGVzU2VsZWN0b3I7XG4gICAgbWF0Y2hlciA9IGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB2ZW5kb3JNYXRjaGVzLmNhbGwodGhpcywgc2VsZWN0b3IpO1xuICAgICAgfTtcbiAgICB9O1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IG1hdGNoZXI7XG4iLCJpbXBvcnQge1NlbGVjdGlvbn0gZnJvbSBcIi4vaW5kZXhcIjtcbmltcG9ydCBtYXRjaGVyIGZyb20gXCIuLi9tYXRjaGVyXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG1hdGNoKSB7XG4gIGlmICh0eXBlb2YgbWF0Y2ggIT09IFwiZnVuY3Rpb25cIikgbWF0Y2ggPSBtYXRjaGVyKG1hdGNoKTtcblxuICBmb3IgKHZhciBncm91cHMgPSB0aGlzLl9ncm91cHMsIG0gPSBncm91cHMubGVuZ3RoLCBzdWJncm91cHMgPSBuZXcgQXJyYXkobSksIGogPSAwOyBqIDwgbTsgKytqKSB7XG4gICAgZm9yICh2YXIgZ3JvdXAgPSBncm91cHNbal0sIG4gPSBncm91cC5sZW5ndGgsIHN1Ymdyb3VwID0gc3ViZ3JvdXBzW2pdID0gW10sIG5vZGUsIGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAoKG5vZGUgPSBncm91cFtpXSkgJiYgbWF0Y2guY2FsbChub2RlLCBub2RlLl9fZGF0YV9fLCBpLCBncm91cCkpIHtcbiAgICAgICAgc3ViZ3JvdXAucHVzaChub2RlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmV3IFNlbGVjdGlvbihzdWJncm91cHMsIHRoaXMuX3BhcmVudHMpO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odXBkYXRlKSB7XG4gIHJldHVybiBuZXcgQXJyYXkodXBkYXRlLmxlbmd0aCk7XG59XG4iLCJpbXBvcnQgc3BhcnNlIGZyb20gXCIuL3NwYXJzZVwiO1xuaW1wb3J0IHtTZWxlY3Rpb259IGZyb20gXCIuL2luZGV4XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gbmV3IFNlbGVjdGlvbih0aGlzLl9lbnRlciB8fCB0aGlzLl9ncm91cHMubWFwKHNwYXJzZSksIHRoaXMuX3BhcmVudHMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gRW50ZXJOb2RlKHBhcmVudCwgZGF0dW0pIHtcbiAgdGhpcy5vd25lckRvY3VtZW50ID0gcGFyZW50Lm93bmVyRG9jdW1lbnQ7XG4gIHRoaXMubmFtZXNwYWNlVVJJID0gcGFyZW50Lm5hbWVzcGFjZVVSSTtcbiAgdGhpcy5fbmV4dCA9IG51bGw7XG4gIHRoaXMuX3BhcmVudCA9IHBhcmVudDtcbiAgdGhpcy5fX2RhdGFfXyA9IGRhdHVtO1xufVxuXG5FbnRlck5vZGUucHJvdG90eXBlID0ge1xuICBjb25zdHJ1Y3RvcjogRW50ZXJOb2RlLFxuICBhcHBlbmRDaGlsZDogZnVuY3Rpb24oY2hpbGQpIHsgcmV0dXJuIHRoaXMuX3BhcmVudC5pbnNlcnRCZWZvcmUoY2hpbGQsIHRoaXMuX25leHQpOyB9LFxuICBpbnNlcnRCZWZvcmU6IGZ1bmN0aW9uKGNoaWxkLCBuZXh0KSB7IHJldHVybiB0aGlzLl9wYXJlbnQuaW5zZXJ0QmVmb3JlKGNoaWxkLCBuZXh0KTsgfSxcbiAgcXVlcnlTZWxlY3RvcjogZnVuY3Rpb24oc2VsZWN0b3IpIHsgcmV0dXJuIHRoaXMuX3BhcmVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTsgfSxcbiAgcXVlcnlTZWxlY3RvckFsbDogZnVuY3Rpb24oc2VsZWN0b3IpIHsgcmV0dXJuIHRoaXMuX3BhcmVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTsgfVxufTtcbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB4O1xuICB9O1xufVxuIiwiaW1wb3J0IHtTZWxlY3Rpb259IGZyb20gXCIuL2luZGV4XCI7XG5pbXBvcnQge0VudGVyTm9kZX0gZnJvbSBcIi4vZW50ZXJcIjtcbmltcG9ydCBjb25zdGFudCBmcm9tIFwiLi4vY29uc3RhbnRcIjtcblxudmFyIGtleVByZWZpeCA9IFwiJFwiOyAvLyBQcm90ZWN0IGFnYWluc3Qga2V5cyBsaWtlIOKAnF9fcHJvdG9fX+KAnS5cblxuZnVuY3Rpb24gYmluZEluZGV4KHBhcmVudCwgZ3JvdXAsIGVudGVyLCB1cGRhdGUsIGV4aXQsIGRhdGEpIHtcbiAgdmFyIGkgPSAwLFxuICAgICAgbm9kZSxcbiAgICAgIGdyb3VwTGVuZ3RoID0gZ3JvdXAubGVuZ3RoLFxuICAgICAgZGF0YUxlbmd0aCA9IGRhdGEubGVuZ3RoO1xuXG4gIC8vIFB1dCBhbnkgbm9uLW51bGwgbm9kZXMgdGhhdCBmaXQgaW50byB1cGRhdGUuXG4gIC8vIFB1dCBhbnkgbnVsbCBub2RlcyBpbnRvIGVudGVyLlxuICAvLyBQdXQgYW55IHJlbWFpbmluZyBkYXRhIGludG8gZW50ZXIuXG4gIGZvciAoOyBpIDwgZGF0YUxlbmd0aDsgKytpKSB7XG4gICAgaWYgKG5vZGUgPSBncm91cFtpXSkge1xuICAgICAgbm9kZS5fX2RhdGFfXyA9IGRhdGFbaV07XG4gICAgICB1cGRhdGVbaV0gPSBub2RlO1xuICAgIH0gZWxzZSB7XG4gICAgICBlbnRlcltpXSA9IG5ldyBFbnRlck5vZGUocGFyZW50LCBkYXRhW2ldKTtcbiAgICB9XG4gIH1cblxuICAvLyBQdXQgYW55IG5vbi1udWxsIG5vZGVzIHRoYXQgZG9u4oCZdCBmaXQgaW50byBleGl0LlxuICBmb3IgKDsgaSA8IGdyb3VwTGVuZ3RoOyArK2kpIHtcbiAgICBpZiAobm9kZSA9IGdyb3VwW2ldKSB7XG4gICAgICBleGl0W2ldID0gbm9kZTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gYmluZEtleShwYXJlbnQsIGdyb3VwLCBlbnRlciwgdXBkYXRlLCBleGl0LCBkYXRhLCBrZXkpIHtcbiAgdmFyIGksXG4gICAgICBub2RlLFxuICAgICAgbm9kZUJ5S2V5VmFsdWUgPSB7fSxcbiAgICAgIGdyb3VwTGVuZ3RoID0gZ3JvdXAubGVuZ3RoLFxuICAgICAgZGF0YUxlbmd0aCA9IGRhdGEubGVuZ3RoLFxuICAgICAga2V5VmFsdWVzID0gbmV3IEFycmF5KGdyb3VwTGVuZ3RoKSxcbiAgICAgIGtleVZhbHVlO1xuXG4gIC8vIENvbXB1dGUgdGhlIGtleSBmb3IgZWFjaCBub2RlLlxuICAvLyBJZiBtdWx0aXBsZSBub2RlcyBoYXZlIHRoZSBzYW1lIGtleSwgdGhlIGR1cGxpY2F0ZXMgYXJlIGFkZGVkIHRvIGV4aXQuXG4gIGZvciAoaSA9IDA7IGkgPCBncm91cExlbmd0aDsgKytpKSB7XG4gICAgaWYgKG5vZGUgPSBncm91cFtpXSkge1xuICAgICAga2V5VmFsdWVzW2ldID0ga2V5VmFsdWUgPSBrZXlQcmVmaXggKyBrZXkuY2FsbChub2RlLCBub2RlLl9fZGF0YV9fLCBpLCBncm91cCk7XG4gICAgICBpZiAoa2V5VmFsdWUgaW4gbm9kZUJ5S2V5VmFsdWUpIHtcbiAgICAgICAgZXhpdFtpXSA9IG5vZGU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBub2RlQnlLZXlWYWx1ZVtrZXlWYWx1ZV0gPSBub2RlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIENvbXB1dGUgdGhlIGtleSBmb3IgZWFjaCBkYXR1bS5cbiAgLy8gSWYgdGhlcmUgYSBub2RlIGFzc29jaWF0ZWQgd2l0aCB0aGlzIGtleSwgam9pbiBhbmQgYWRkIGl0IHRvIHVwZGF0ZS5cbiAgLy8gSWYgdGhlcmUgaXMgbm90IChvciB0aGUga2V5IGlzIGEgZHVwbGljYXRlKSwgYWRkIGl0IHRvIGVudGVyLlxuICBmb3IgKGkgPSAwOyBpIDwgZGF0YUxlbmd0aDsgKytpKSB7XG4gICAga2V5VmFsdWUgPSBrZXlQcmVmaXggKyBrZXkuY2FsbChwYXJlbnQsIGRhdGFbaV0sIGksIGRhdGEpO1xuICAgIGlmIChub2RlID0gbm9kZUJ5S2V5VmFsdWVba2V5VmFsdWVdKSB7XG4gICAgICB1cGRhdGVbaV0gPSBub2RlO1xuICAgICAgbm9kZS5fX2RhdGFfXyA9IGRhdGFbaV07XG4gICAgICBub2RlQnlLZXlWYWx1ZVtrZXlWYWx1ZV0gPSBudWxsO1xuICAgIH0gZWxzZSB7XG4gICAgICBlbnRlcltpXSA9IG5ldyBFbnRlck5vZGUocGFyZW50LCBkYXRhW2ldKTtcbiAgICB9XG4gIH1cblxuICAvLyBBZGQgYW55IHJlbWFpbmluZyBub2RlcyB0aGF0IHdlcmUgbm90IGJvdW5kIHRvIGRhdGEgdG8gZXhpdC5cbiAgZm9yIChpID0gMDsgaSA8IGdyb3VwTGVuZ3RoOyArK2kpIHtcbiAgICBpZiAoKG5vZGUgPSBncm91cFtpXSkgJiYgKG5vZGVCeUtleVZhbHVlW2tleVZhbHVlc1tpXV0gPT09IG5vZGUpKSB7XG4gICAgICBleGl0W2ldID0gbm9kZTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICBpZiAoIXZhbHVlKSB7XG4gICAgZGF0YSA9IG5ldyBBcnJheSh0aGlzLnNpemUoKSksIGogPSAtMTtcbiAgICB0aGlzLmVhY2goZnVuY3Rpb24oZCkgeyBkYXRhWysral0gPSBkOyB9KTtcbiAgICByZXR1cm4gZGF0YTtcbiAgfVxuXG4gIHZhciBiaW5kID0ga2V5ID8gYmluZEtleSA6IGJpbmRJbmRleCxcbiAgICAgIHBhcmVudHMgPSB0aGlzLl9wYXJlbnRzLFxuICAgICAgZ3JvdXBzID0gdGhpcy5fZ3JvdXBzO1xuXG4gIGlmICh0eXBlb2YgdmFsdWUgIT09IFwiZnVuY3Rpb25cIikgdmFsdWUgPSBjb25zdGFudCh2YWx1ZSk7XG5cbiAgZm9yICh2YXIgbSA9IGdyb3Vwcy5sZW5ndGgsIHVwZGF0ZSA9IG5ldyBBcnJheShtKSwgZW50ZXIgPSBuZXcgQXJyYXkobSksIGV4aXQgPSBuZXcgQXJyYXkobSksIGogPSAwOyBqIDwgbTsgKytqKSB7XG4gICAgdmFyIHBhcmVudCA9IHBhcmVudHNbal0sXG4gICAgICAgIGdyb3VwID0gZ3JvdXBzW2pdLFxuICAgICAgICBncm91cExlbmd0aCA9IGdyb3VwLmxlbmd0aCxcbiAgICAgICAgZGF0YSA9IHZhbHVlLmNhbGwocGFyZW50LCBwYXJlbnQgJiYgcGFyZW50Ll9fZGF0YV9fLCBqLCBwYXJlbnRzKSxcbiAgICAgICAgZGF0YUxlbmd0aCA9IGRhdGEubGVuZ3RoLFxuICAgICAgICBlbnRlckdyb3VwID0gZW50ZXJbal0gPSBuZXcgQXJyYXkoZGF0YUxlbmd0aCksXG4gICAgICAgIHVwZGF0ZUdyb3VwID0gdXBkYXRlW2pdID0gbmV3IEFycmF5KGRhdGFMZW5ndGgpLFxuICAgICAgICBleGl0R3JvdXAgPSBleGl0W2pdID0gbmV3IEFycmF5KGdyb3VwTGVuZ3RoKTtcblxuICAgIGJpbmQocGFyZW50LCBncm91cCwgZW50ZXJHcm91cCwgdXBkYXRlR3JvdXAsIGV4aXRHcm91cCwgZGF0YSwga2V5KTtcblxuICAgIC8vIE5vdyBjb25uZWN0IHRoZSBlbnRlciBub2RlcyB0byB0aGVpciBmb2xsb3dpbmcgdXBkYXRlIG5vZGUsIHN1Y2ggdGhhdFxuICAgIC8vIGFwcGVuZENoaWxkIGNhbiBpbnNlcnQgdGhlIG1hdGVyaWFsaXplZCBlbnRlciBub2RlIGJlZm9yZSB0aGlzIG5vZGUsXG4gICAgLy8gcmF0aGVyIHRoYW4gYXQgdGhlIGVuZCBvZiB0aGUgcGFyZW50IG5vZGUuXG4gICAgZm9yICh2YXIgaTAgPSAwLCBpMSA9IDAsIHByZXZpb3VzLCBuZXh0OyBpMCA8IGRhdGFMZW5ndGg7ICsraTApIHtcbiAgICAgIGlmIChwcmV2aW91cyA9IGVudGVyR3JvdXBbaTBdKSB7XG4gICAgICAgIGlmIChpMCA+PSBpMSkgaTEgPSBpMCArIDE7XG4gICAgICAgIHdoaWxlICghKG5leHQgPSB1cGRhdGVHcm91cFtpMV0pICYmICsraTEgPCBkYXRhTGVuZ3RoKTtcbiAgICAgICAgcHJldmlvdXMuX25leHQgPSBuZXh0IHx8IG51bGw7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgdXBkYXRlID0gbmV3IFNlbGVjdGlvbih1cGRhdGUsIHBhcmVudHMpO1xuICB1cGRhdGUuX2VudGVyID0gZW50ZXI7XG4gIHVwZGF0ZS5fZXhpdCA9IGV4aXQ7XG4gIHJldHVybiB1cGRhdGU7XG59XG4iLCJpbXBvcnQgc3BhcnNlIGZyb20gXCIuL3NwYXJzZVwiO1xuaW1wb3J0IHtTZWxlY3Rpb259IGZyb20gXCIuL2luZGV4XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gbmV3IFNlbGVjdGlvbih0aGlzLl9leGl0IHx8IHRoaXMuX2dyb3Vwcy5tYXAoc3BhcnNlKSwgdGhpcy5fcGFyZW50cyk7XG59XG4iLCJpbXBvcnQge1NlbGVjdGlvbn0gZnJvbSBcIi4vaW5kZXhcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oc2VsZWN0aW9uKSB7XG5cbiAgZm9yICh2YXIgZ3JvdXBzMCA9IHRoaXMuX2dyb3VwcywgZ3JvdXBzMSA9IHNlbGVjdGlvbi5fZ3JvdXBzLCBtMCA9IGdyb3VwczAubGVuZ3RoLCBtMSA9IGdyb3VwczEubGVuZ3RoLCBtID0gTWF0aC5taW4obTAsIG0xKSwgbWVyZ2VzID0gbmV3IEFycmF5KG0wKSwgaiA9IDA7IGogPCBtOyArK2opIHtcbiAgICBmb3IgKHZhciBncm91cDAgPSBncm91cHMwW2pdLCBncm91cDEgPSBncm91cHMxW2pdLCBuID0gZ3JvdXAwLmxlbmd0aCwgbWVyZ2UgPSBtZXJnZXNbal0gPSBuZXcgQXJyYXkobiksIG5vZGUsIGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAobm9kZSA9IGdyb3VwMFtpXSB8fCBncm91cDFbaV0pIHtcbiAgICAgICAgbWVyZ2VbaV0gPSBub2RlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZvciAoOyBqIDwgbTA7ICsraikge1xuICAgIG1lcmdlc1tqXSA9IGdyb3VwczBbal07XG4gIH1cblxuICByZXR1cm4gbmV3IFNlbGVjdGlvbihtZXJnZXMsIHRoaXMuX3BhcmVudHMpO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG5cbiAgZm9yICh2YXIgZ3JvdXBzID0gdGhpcy5fZ3JvdXBzLCBqID0gLTEsIG0gPSBncm91cHMubGVuZ3RoOyArK2ogPCBtOykge1xuICAgIGZvciAodmFyIGdyb3VwID0gZ3JvdXBzW2pdLCBpID0gZ3JvdXAubGVuZ3RoIC0gMSwgbmV4dCA9IGdyb3VwW2ldLCBub2RlOyAtLWkgPj0gMDspIHtcbiAgICAgIGlmIChub2RlID0gZ3JvdXBbaV0pIHtcbiAgICAgICAgaWYgKG5leHQgJiYgbmV4dCAhPT0gbm9kZS5uZXh0U2libGluZykgbmV4dC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShub2RlLCBuZXh0KTtcbiAgICAgICAgbmV4dCA9IG5vZGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59XG4iLCJpbXBvcnQge1NlbGVjdGlvbn0gZnJvbSBcIi4vaW5kZXhcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oY29tcGFyZSkge1xuICBpZiAoIWNvbXBhcmUpIGNvbXBhcmUgPSBhc2NlbmRpbmc7XG5cbiAgZnVuY3Rpb24gY29tcGFyZU5vZGUoYSwgYikge1xuICAgIHJldHVybiBhICYmIGIgPyBjb21wYXJlKGEuX19kYXRhX18sIGIuX19kYXRhX18pIDogIWEgLSAhYjtcbiAgfVxuXG4gIGZvciAodmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcywgbSA9IGdyb3Vwcy5sZW5ndGgsIHNvcnRncm91cHMgPSBuZXcgQXJyYXkobSksIGogPSAwOyBqIDwgbTsgKytqKSB7XG4gICAgZm9yICh2YXIgZ3JvdXAgPSBncm91cHNbal0sIG4gPSBncm91cC5sZW5ndGgsIHNvcnRncm91cCA9IHNvcnRncm91cHNbal0gPSBuZXcgQXJyYXkobiksIG5vZGUsIGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAobm9kZSA9IGdyb3VwW2ldKSB7XG4gICAgICAgIHNvcnRncm91cFtpXSA9IG5vZGU7XG4gICAgICB9XG4gICAgfVxuICAgIHNvcnRncm91cC5zb3J0KGNvbXBhcmVOb2RlKTtcbiAgfVxuXG4gIHJldHVybiBuZXcgU2VsZWN0aW9uKHNvcnRncm91cHMsIHRoaXMuX3BhcmVudHMpLm9yZGVyKCk7XG59XG5cbmZ1bmN0aW9uIGFzY2VuZGluZyhhLCBiKSB7XG4gIHJldHVybiBhIDwgYiA/IC0xIDogYSA+IGIgPyAxIDogYSA+PSBiID8gMCA6IE5hTjtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICB2YXIgY2FsbGJhY2sgPSBhcmd1bWVudHNbMF07XG4gIGFyZ3VtZW50c1swXSA9IHRoaXM7XG4gIGNhbGxiYWNrLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gIHJldHVybiB0aGlzO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIHZhciBub2RlcyA9IG5ldyBBcnJheSh0aGlzLnNpemUoKSksIGkgPSAtMTtcbiAgdGhpcy5lYWNoKGZ1bmN0aW9uKCkgeyBub2Rlc1srK2ldID0gdGhpczsgfSk7XG4gIHJldHVybiBub2Rlcztcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuXG4gIGZvciAodmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcywgaiA9IDAsIG0gPSBncm91cHMubGVuZ3RoOyBqIDwgbTsgKytqKSB7XG4gICAgZm9yICh2YXIgZ3JvdXAgPSBncm91cHNbal0sIGkgPSAwLCBuID0gZ3JvdXAubGVuZ3RoOyBpIDwgbjsgKytpKSB7XG4gICAgICB2YXIgbm9kZSA9IGdyb3VwW2ldO1xuICAgICAgaWYgKG5vZGUpIHJldHVybiBub2RlO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIHZhciBzaXplID0gMDtcbiAgdGhpcy5lYWNoKGZ1bmN0aW9uKCkgeyArK3NpemU7IH0pO1xuICByZXR1cm4gc2l6ZTtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gIXRoaXMubm9kZSgpO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oY2FsbGJhY2spIHtcblxuICBmb3IgKHZhciBncm91cHMgPSB0aGlzLl9ncm91cHMsIGogPSAwLCBtID0gZ3JvdXBzLmxlbmd0aDsgaiA8IG07ICsraikge1xuICAgIGZvciAodmFyIGdyb3VwID0gZ3JvdXBzW2pdLCBpID0gMCwgbiA9IGdyb3VwLmxlbmd0aCwgbm9kZTsgaSA8IG47ICsraSkge1xuICAgICAgaWYgKG5vZGUgPSBncm91cFtpXSkgY2FsbGJhY2suY2FsbChub2RlLCBub2RlLl9fZGF0YV9fLCBpLCBncm91cCk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59XG4iLCJpbXBvcnQgbmFtZXNwYWNlIGZyb20gXCIuLi9uYW1lc3BhY2VcIjtcblxuZnVuY3Rpb24gYXR0clJlbW92ZShuYW1lKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gYXR0clJlbW92ZU5TKGZ1bGxuYW1lKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnJlbW92ZUF0dHJpYnV0ZU5TKGZ1bGxuYW1lLnNwYWNlLCBmdWxsbmFtZS5sb2NhbCk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGF0dHJDb25zdGFudChuYW1lLCB2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zZXRBdHRyaWJ1dGUobmFtZSwgdmFsdWUpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhdHRyQ29uc3RhbnROUyhmdWxsbmFtZSwgdmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc2V0QXR0cmlidXRlTlMoZnVsbG5hbWUuc3BhY2UsIGZ1bGxuYW1lLmxvY2FsLCB2YWx1ZSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGF0dHJGdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHYgPSB2YWx1ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIGlmICh2ID09IG51bGwpIHRoaXMucmVtb3ZlQXR0cmlidXRlKG5hbWUpO1xuICAgIGVsc2UgdGhpcy5zZXRBdHRyaWJ1dGUobmFtZSwgdik7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGF0dHJGdW5jdGlvbk5TKGZ1bGxuYW1lLCB2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHYgPSB2YWx1ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIGlmICh2ID09IG51bGwpIHRoaXMucmVtb3ZlQXR0cmlidXRlTlMoZnVsbG5hbWUuc3BhY2UsIGZ1bGxuYW1lLmxvY2FsKTtcbiAgICBlbHNlIHRoaXMuc2V0QXR0cmlidXRlTlMoZnVsbG5hbWUuc3BhY2UsIGZ1bGxuYW1lLmxvY2FsLCB2KTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgdmFyIGZ1bGxuYW1lID0gbmFtZXNwYWNlKG5hbWUpO1xuXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgIHZhciBub2RlID0gdGhpcy5ub2RlKCk7XG4gICAgcmV0dXJuIGZ1bGxuYW1lLmxvY2FsXG4gICAgICAgID8gbm9kZS5nZXRBdHRyaWJ1dGVOUyhmdWxsbmFtZS5zcGFjZSwgZnVsbG5hbWUubG9jYWwpXG4gICAgICAgIDogbm9kZS5nZXRBdHRyaWJ1dGUoZnVsbG5hbWUpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXMuZWFjaCgodmFsdWUgPT0gbnVsbFxuICAgICAgPyAoZnVsbG5hbWUubG9jYWwgPyBhdHRyUmVtb3ZlTlMgOiBhdHRyUmVtb3ZlKSA6ICh0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIlxuICAgICAgPyAoZnVsbG5hbWUubG9jYWwgPyBhdHRyRnVuY3Rpb25OUyA6IGF0dHJGdW5jdGlvbilcbiAgICAgIDogKGZ1bGxuYW1lLmxvY2FsID8gYXR0ckNvbnN0YW50TlMgOiBhdHRyQ29uc3RhbnQpKSkoZnVsbG5hbWUsIHZhbHVlKSk7XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbihub2RlKSB7XG4gIHJldHVybiAobm9kZS5vd25lckRvY3VtZW50ICYmIG5vZGUub3duZXJEb2N1bWVudC5kZWZhdWx0VmlldykgLy8gbm9kZSBpcyBhIE5vZGVcbiAgICAgIHx8IChub2RlLmRvY3VtZW50ICYmIG5vZGUpIC8vIG5vZGUgaXMgYSBXaW5kb3dcbiAgICAgIHx8IG5vZGUuZGVmYXVsdFZpZXc7IC8vIG5vZGUgaXMgYSBEb2N1bWVudFxufVxuIiwiaW1wb3J0IGRlZmF1bHRWaWV3IGZyb20gXCIuLi93aW5kb3dcIjtcblxuZnVuY3Rpb24gc3R5bGVSZW1vdmUobmFtZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zdHlsZS5yZW1vdmVQcm9wZXJ0eShuYW1lKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gc3R5bGVDb25zdGFudChuYW1lLCB2YWx1ZSwgcHJpb3JpdHkpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc3R5bGUuc2V0UHJvcGVydHkobmFtZSwgdmFsdWUsIHByaW9yaXR5KTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gc3R5bGVGdW5jdGlvbihuYW1lLCB2YWx1ZSwgcHJpb3JpdHkpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciB2ID0gdmFsdWUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBpZiAodiA9PSBudWxsKSB0aGlzLnN0eWxlLnJlbW92ZVByb3BlcnR5KG5hbWUpO1xuICAgIGVsc2UgdGhpcy5zdHlsZS5zZXRQcm9wZXJ0eShuYW1lLCB2LCBwcmlvcml0eSk7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5hbWUsIHZhbHVlLCBwcmlvcml0eSkge1xuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA+IDFcbiAgICAgID8gdGhpcy5lYWNoKCh2YWx1ZSA9PSBudWxsXG4gICAgICAgICAgICA/IHN0eWxlUmVtb3ZlIDogdHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCJcbiAgICAgICAgICAgID8gc3R5bGVGdW5jdGlvblxuICAgICAgICAgICAgOiBzdHlsZUNvbnN0YW50KShuYW1lLCB2YWx1ZSwgcHJpb3JpdHkgPT0gbnVsbCA/IFwiXCIgOiBwcmlvcml0eSkpXG4gICAgICA6IHN0eWxlVmFsdWUodGhpcy5ub2RlKCksIG5hbWUpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3R5bGVWYWx1ZShub2RlLCBuYW1lKSB7XG4gIHJldHVybiBub2RlLnN0eWxlLmdldFByb3BlcnR5VmFsdWUobmFtZSlcbiAgICAgIHx8IGRlZmF1bHRWaWV3KG5vZGUpLmdldENvbXB1dGVkU3R5bGUobm9kZSwgbnVsbCkuZ2V0UHJvcGVydHlWYWx1ZShuYW1lKTtcbn1cbiIsImZ1bmN0aW9uIHByb3BlcnR5UmVtb3ZlKG5hbWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIGRlbGV0ZSB0aGlzW25hbWVdO1xuICB9O1xufVxuXG5mdW5jdGlvbiBwcm9wZXJ0eUNvbnN0YW50KG5hbWUsIHZhbHVlKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB0aGlzW25hbWVdID0gdmFsdWU7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHByb3BlcnR5RnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciB2ID0gdmFsdWUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBpZiAodiA9PSBudWxsKSBkZWxldGUgdGhpc1tuYW1lXTtcbiAgICBlbHNlIHRoaXNbbmFtZV0gPSB2O1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA+IDFcbiAgICAgID8gdGhpcy5lYWNoKCh2YWx1ZSA9PSBudWxsXG4gICAgICAgICAgPyBwcm9wZXJ0eVJlbW92ZSA6IHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiXG4gICAgICAgICAgPyBwcm9wZXJ0eUZ1bmN0aW9uXG4gICAgICAgICAgOiBwcm9wZXJ0eUNvbnN0YW50KShuYW1lLCB2YWx1ZSkpXG4gICAgICA6IHRoaXMubm9kZSgpW25hbWVdO1xufVxuIiwiZnVuY3Rpb24gY2xhc3NBcnJheShzdHJpbmcpIHtcbiAgcmV0dXJuIHN0cmluZy50cmltKCkuc3BsaXQoL158XFxzKy8pO1xufVxuXG5mdW5jdGlvbiBjbGFzc0xpc3Qobm9kZSkge1xuICByZXR1cm4gbm9kZS5jbGFzc0xpc3QgfHwgbmV3IENsYXNzTGlzdChub2RlKTtcbn1cblxuZnVuY3Rpb24gQ2xhc3NMaXN0KG5vZGUpIHtcbiAgdGhpcy5fbm9kZSA9IG5vZGU7XG4gIHRoaXMuX25hbWVzID0gY2xhc3NBcnJheShub2RlLmdldEF0dHJpYnV0ZShcImNsYXNzXCIpIHx8IFwiXCIpO1xufVxuXG5DbGFzc0xpc3QucHJvdG90eXBlID0ge1xuICBhZGQ6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgaSA9IHRoaXMuX25hbWVzLmluZGV4T2YobmFtZSk7XG4gICAgaWYgKGkgPCAwKSB7XG4gICAgICB0aGlzLl9uYW1lcy5wdXNoKG5hbWUpO1xuICAgICAgdGhpcy5fbm9kZS5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCB0aGlzLl9uYW1lcy5qb2luKFwiIFwiKSk7XG4gICAgfVxuICB9LFxuICByZW1vdmU6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgaSA9IHRoaXMuX25hbWVzLmluZGV4T2YobmFtZSk7XG4gICAgaWYgKGkgPj0gMCkge1xuICAgICAgdGhpcy5fbmFtZXMuc3BsaWNlKGksIDEpO1xuICAgICAgdGhpcy5fbm9kZS5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCB0aGlzLl9uYW1lcy5qb2luKFwiIFwiKSk7XG4gICAgfVxuICB9LFxuICBjb250YWluczogZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLl9uYW1lcy5pbmRleE9mKG5hbWUpID49IDA7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGNsYXNzZWRBZGQobm9kZSwgbmFtZXMpIHtcbiAgdmFyIGxpc3QgPSBjbGFzc0xpc3Qobm9kZSksIGkgPSAtMSwgbiA9IG5hbWVzLmxlbmd0aDtcbiAgd2hpbGUgKCsraSA8IG4pIGxpc3QuYWRkKG5hbWVzW2ldKTtcbn1cblxuZnVuY3Rpb24gY2xhc3NlZFJlbW92ZShub2RlLCBuYW1lcykge1xuICB2YXIgbGlzdCA9IGNsYXNzTGlzdChub2RlKSwgaSA9IC0xLCBuID0gbmFtZXMubGVuZ3RoO1xuICB3aGlsZSAoKytpIDwgbikgbGlzdC5yZW1vdmUobmFtZXNbaV0pO1xufVxuXG5mdW5jdGlvbiBjbGFzc2VkVHJ1ZShuYW1lcykge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgY2xhc3NlZEFkZCh0aGlzLCBuYW1lcyk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGNsYXNzZWRGYWxzZShuYW1lcykge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgY2xhc3NlZFJlbW92ZSh0aGlzLCBuYW1lcyk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGNsYXNzZWRGdW5jdGlvbihuYW1lcywgdmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICh2YWx1ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpID8gY2xhc3NlZEFkZCA6IGNsYXNzZWRSZW1vdmUpKHRoaXMsIG5hbWVzKTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgdmFyIG5hbWVzID0gY2xhc3NBcnJheShuYW1lICsgXCJcIik7XG5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyKSB7XG4gICAgdmFyIGxpc3QgPSBjbGFzc0xpc3QodGhpcy5ub2RlKCkpLCBpID0gLTEsIG4gPSBuYW1lcy5sZW5ndGg7XG4gICAgd2hpbGUgKCsraSA8IG4pIGlmICghbGlzdC5jb250YWlucyhuYW1lc1tpXSkpIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHJldHVybiB0aGlzLmVhY2goKHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiXG4gICAgICA/IGNsYXNzZWRGdW5jdGlvbiA6IHZhbHVlXG4gICAgICA/IGNsYXNzZWRUcnVlXG4gICAgICA6IGNsYXNzZWRGYWxzZSkobmFtZXMsIHZhbHVlKSk7XG59XG4iLCJmdW5jdGlvbiB0ZXh0UmVtb3ZlKCkge1xuICB0aGlzLnRleHRDb250ZW50ID0gXCJcIjtcbn1cblxuZnVuY3Rpb24gdGV4dENvbnN0YW50KHZhbHVlKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnRleHRDb250ZW50ID0gdmFsdWU7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHRleHRGdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHYgPSB2YWx1ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIHRoaXMudGV4dENvbnRlbnQgPSB2ID09IG51bGwgPyBcIlwiIDogdjtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGhcbiAgICAgID8gdGhpcy5lYWNoKHZhbHVlID09IG51bGxcbiAgICAgICAgICA/IHRleHRSZW1vdmUgOiAodHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCJcbiAgICAgICAgICA/IHRleHRGdW5jdGlvblxuICAgICAgICAgIDogdGV4dENvbnN0YW50KSh2YWx1ZSkpXG4gICAgICA6IHRoaXMubm9kZSgpLnRleHRDb250ZW50O1xufVxuIiwiZnVuY3Rpb24gaHRtbFJlbW92ZSgpIHtcbiAgdGhpcy5pbm5lckhUTUwgPSBcIlwiO1xufVxuXG5mdW5jdGlvbiBodG1sQ29uc3RhbnQodmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuaW5uZXJIVE1MID0gdmFsdWU7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGh0bWxGdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHYgPSB2YWx1ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIHRoaXMuaW5uZXJIVE1MID0gdiA9PSBudWxsID8gXCJcIiA6IHY7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiBhcmd1bWVudHMubGVuZ3RoXG4gICAgICA/IHRoaXMuZWFjaCh2YWx1ZSA9PSBudWxsXG4gICAgICAgICAgPyBodG1sUmVtb3ZlIDogKHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiXG4gICAgICAgICAgPyBodG1sRnVuY3Rpb25cbiAgICAgICAgICA6IGh0bWxDb25zdGFudCkodmFsdWUpKVxuICAgICAgOiB0aGlzLm5vZGUoKS5pbm5lckhUTUw7XG59XG4iLCJmdW5jdGlvbiByYWlzZSgpIHtcbiAgaWYgKHRoaXMubmV4dFNpYmxpbmcpIHRoaXMucGFyZW50Tm9kZS5hcHBlbmRDaGlsZCh0aGlzKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmVhY2gocmFpc2UpO1xufVxuIiwiZnVuY3Rpb24gbG93ZXIoKSB7XG4gIGlmICh0aGlzLnByZXZpb3VzU2libGluZykgdGhpcy5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLCB0aGlzLnBhcmVudE5vZGUuZmlyc3RDaGlsZCk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5lYWNoKGxvd2VyKTtcbn1cbiIsImltcG9ydCBjcmVhdG9yIGZyb20gXCIuLi9jcmVhdG9yXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5hbWUpIHtcbiAgdmFyIGNyZWF0ZSA9IHR5cGVvZiBuYW1lID09PSBcImZ1bmN0aW9uXCIgPyBuYW1lIDogY3JlYXRvcihuYW1lKTtcbiAgcmV0dXJuIHRoaXMuc2VsZWN0KGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmFwcGVuZENoaWxkKGNyZWF0ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpKTtcbiAgfSk7XG59XG4iLCJpbXBvcnQgY3JlYXRvciBmcm9tIFwiLi4vY3JlYXRvclwiO1xuaW1wb3J0IHNlbGVjdG9yIGZyb20gXCIuLi9zZWxlY3RvclwiO1xuXG5mdW5jdGlvbiBjb25zdGFudE51bGwoKSB7XG4gIHJldHVybiBudWxsO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihuYW1lLCBiZWZvcmUpIHtcbiAgdmFyIGNyZWF0ZSA9IHR5cGVvZiBuYW1lID09PSBcImZ1bmN0aW9uXCIgPyBuYW1lIDogY3JlYXRvcihuYW1lKSxcbiAgICAgIHNlbGVjdCA9IGJlZm9yZSA9PSBudWxsID8gY29uc3RhbnROdWxsIDogdHlwZW9mIGJlZm9yZSA9PT0gXCJmdW5jdGlvblwiID8gYmVmb3JlIDogc2VsZWN0b3IoYmVmb3JlKTtcbiAgcmV0dXJuIHRoaXMuc2VsZWN0KGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmluc2VydEJlZm9yZShjcmVhdGUuYXBwbHkodGhpcywgYXJndW1lbnRzKSwgc2VsZWN0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgfHwgbnVsbCk7XG4gIH0pO1xufVxuIiwiZnVuY3Rpb24gcmVtb3ZlKCkge1xuICB2YXIgcGFyZW50ID0gdGhpcy5wYXJlbnROb2RlO1xuICBpZiAocGFyZW50KSBwYXJlbnQucmVtb3ZlQ2hpbGQodGhpcyk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5lYWNoKHJlbW92ZSk7XG59XG4iLCJmdW5jdGlvbiBzZWxlY3Rpb25fY2xvbmVTaGFsbG93KCkge1xuICByZXR1cm4gdGhpcy5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLmNsb25lTm9kZShmYWxzZSksIHRoaXMubmV4dFNpYmxpbmcpO1xufVxuXG5mdW5jdGlvbiBzZWxlY3Rpb25fY2xvbmVEZWVwKCkge1xuICByZXR1cm4gdGhpcy5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLmNsb25lTm9kZSh0cnVlKSwgdGhpcy5uZXh0U2libGluZyk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGRlZXApIHtcbiAgcmV0dXJuIHRoaXMuc2VsZWN0KGRlZXAgPyBzZWxlY3Rpb25fY2xvbmVEZWVwIDogc2VsZWN0aW9uX2Nsb25lU2hhbGxvdyk7XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aFxuICAgICAgPyB0aGlzLnByb3BlcnR5KFwiX19kYXRhX19cIiwgdmFsdWUpXG4gICAgICA6IHRoaXMubm9kZSgpLl9fZGF0YV9fO1xufVxuIiwidmFyIGZpbHRlckV2ZW50cyA9IHt9O1xuXG5leHBvcnQgdmFyIGV2ZW50ID0gbnVsbDtcblxuaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgaWYgKCEoXCJvbm1vdXNlZW50ZXJcIiBpbiBlbGVtZW50KSkge1xuICAgIGZpbHRlckV2ZW50cyA9IHttb3VzZWVudGVyOiBcIm1vdXNlb3ZlclwiLCBtb3VzZWxlYXZlOiBcIm1vdXNlb3V0XCJ9O1xuICB9XG59XG5cbmZ1bmN0aW9uIGZpbHRlckNvbnRleHRMaXN0ZW5lcihsaXN0ZW5lciwgaW5kZXgsIGdyb3VwKSB7XG4gIGxpc3RlbmVyID0gY29udGV4dExpc3RlbmVyKGxpc3RlbmVyLCBpbmRleCwgZ3JvdXApO1xuICByZXR1cm4gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICB2YXIgcmVsYXRlZCA9IGV2ZW50LnJlbGF0ZWRUYXJnZXQ7XG4gICAgaWYgKCFyZWxhdGVkIHx8IChyZWxhdGVkICE9PSB0aGlzICYmICEocmVsYXRlZC5jb21wYXJlRG9jdW1lbnRQb3NpdGlvbih0aGlzKSAmIDgpKSkge1xuICAgICAgbGlzdGVuZXIuY2FsbCh0aGlzLCBldmVudCk7XG4gICAgfVxuICB9O1xufVxuXG5mdW5jdGlvbiBjb250ZXh0TGlzdGVuZXIobGlzdGVuZXIsIGluZGV4LCBncm91cCkge1xuICByZXR1cm4gZnVuY3Rpb24oZXZlbnQxKSB7XG4gICAgdmFyIGV2ZW50MCA9IGV2ZW50OyAvLyBFdmVudHMgY2FuIGJlIHJlZW50cmFudCAoZS5nLiwgZm9jdXMpLlxuICAgIGV2ZW50ID0gZXZlbnQxO1xuICAgIHRyeSB7XG4gICAgICBsaXN0ZW5lci5jYWxsKHRoaXMsIHRoaXMuX19kYXRhX18sIGluZGV4LCBncm91cCk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGV2ZW50ID0gZXZlbnQwO1xuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gcGFyc2VUeXBlbmFtZXModHlwZW5hbWVzKSB7XG4gIHJldHVybiB0eXBlbmFtZXMudHJpbSgpLnNwbGl0KC9efFxccysvKS5tYXAoZnVuY3Rpb24odCkge1xuICAgIHZhciBuYW1lID0gXCJcIiwgaSA9IHQuaW5kZXhPZihcIi5cIik7XG4gICAgaWYgKGkgPj0gMCkgbmFtZSA9IHQuc2xpY2UoaSArIDEpLCB0ID0gdC5zbGljZSgwLCBpKTtcbiAgICByZXR1cm4ge3R5cGU6IHQsIG5hbWU6IG5hbWV9O1xuICB9KTtcbn1cblxuZnVuY3Rpb24gb25SZW1vdmUodHlwZW5hbWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciBvbiA9IHRoaXMuX19vbjtcbiAgICBpZiAoIW9uKSByZXR1cm47XG4gICAgZm9yICh2YXIgaiA9IDAsIGkgPSAtMSwgbSA9IG9uLmxlbmd0aCwgbzsgaiA8IG07ICsraikge1xuICAgICAgaWYgKG8gPSBvbltqXSwgKCF0eXBlbmFtZS50eXBlIHx8IG8udHlwZSA9PT0gdHlwZW5hbWUudHlwZSkgJiYgby5uYW1lID09PSB0eXBlbmFtZS5uYW1lKSB7XG4gICAgICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcihvLnR5cGUsIG8ubGlzdGVuZXIsIG8uY2FwdHVyZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvblsrK2ldID0gbztcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCsraSkgb24ubGVuZ3RoID0gaTtcbiAgICBlbHNlIGRlbGV0ZSB0aGlzLl9fb247XG4gIH07XG59XG5cbmZ1bmN0aW9uIG9uQWRkKHR5cGVuYW1lLCB2YWx1ZSwgY2FwdHVyZSkge1xuICB2YXIgd3JhcCA9IGZpbHRlckV2ZW50cy5oYXNPd25Qcm9wZXJ0eSh0eXBlbmFtZS50eXBlKSA/IGZpbHRlckNvbnRleHRMaXN0ZW5lciA6IGNvbnRleHRMaXN0ZW5lcjtcbiAgcmV0dXJuIGZ1bmN0aW9uKGQsIGksIGdyb3VwKSB7XG4gICAgdmFyIG9uID0gdGhpcy5fX29uLCBvLCBsaXN0ZW5lciA9IHdyYXAodmFsdWUsIGksIGdyb3VwKTtcbiAgICBpZiAob24pIGZvciAodmFyIGogPSAwLCBtID0gb24ubGVuZ3RoOyBqIDwgbTsgKytqKSB7XG4gICAgICBpZiAoKG8gPSBvbltqXSkudHlwZSA9PT0gdHlwZW5hbWUudHlwZSAmJiBvLm5hbWUgPT09IHR5cGVuYW1lLm5hbWUpIHtcbiAgICAgICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKG8udHlwZSwgby5saXN0ZW5lciwgby5jYXB0dXJlKTtcbiAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKG8udHlwZSwgby5saXN0ZW5lciA9IGxpc3RlbmVyLCBvLmNhcHR1cmUgPSBjYXB0dXJlKTtcbiAgICAgICAgby52YWx1ZSA9IHZhbHVlO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcih0eXBlbmFtZS50eXBlLCBsaXN0ZW5lciwgY2FwdHVyZSk7XG4gICAgbyA9IHt0eXBlOiB0eXBlbmFtZS50eXBlLCBuYW1lOiB0eXBlbmFtZS5uYW1lLCB2YWx1ZTogdmFsdWUsIGxpc3RlbmVyOiBsaXN0ZW5lciwgY2FwdHVyZTogY2FwdHVyZX07XG4gICAgaWYgKCFvbikgdGhpcy5fX29uID0gW29dO1xuICAgIGVsc2Ugb24ucHVzaChvKTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odHlwZW5hbWUsIHZhbHVlLCBjYXB0dXJlKSB7XG4gIHZhciB0eXBlbmFtZXMgPSBwYXJzZVR5cGVuYW1lcyh0eXBlbmFtZSArIFwiXCIpLCBpLCBuID0gdHlwZW5hbWVzLmxlbmd0aCwgdDtcblxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDIpIHtcbiAgICB2YXIgb24gPSB0aGlzLm5vZGUoKS5fX29uO1xuICAgIGlmIChvbikgZm9yICh2YXIgaiA9IDAsIG0gPSBvbi5sZW5ndGgsIG87IGogPCBtOyArK2opIHtcbiAgICAgIGZvciAoaSA9IDAsIG8gPSBvbltqXTsgaSA8IG47ICsraSkge1xuICAgICAgICBpZiAoKHQgPSB0eXBlbmFtZXNbaV0pLnR5cGUgPT09IG8udHlwZSAmJiB0Lm5hbWUgPT09IG8ubmFtZSkge1xuICAgICAgICAgIHJldHVybiBvLnZhbHVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybjtcbiAgfVxuXG4gIG9uID0gdmFsdWUgPyBvbkFkZCA6IG9uUmVtb3ZlO1xuICBpZiAoY2FwdHVyZSA9PSBudWxsKSBjYXB0dXJlID0gZmFsc2U7XG4gIGZvciAoaSA9IDA7IGkgPCBuOyArK2kpIHRoaXMuZWFjaChvbih0eXBlbmFtZXNbaV0sIHZhbHVlLCBjYXB0dXJlKSk7XG4gIHJldHVybiB0aGlzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3VzdG9tRXZlbnQoZXZlbnQxLCBsaXN0ZW5lciwgdGhhdCwgYXJncykge1xuICB2YXIgZXZlbnQwID0gZXZlbnQ7XG4gIGV2ZW50MS5zb3VyY2VFdmVudCA9IGV2ZW50O1xuICBldmVudCA9IGV2ZW50MTtcbiAgdHJ5IHtcbiAgICByZXR1cm4gbGlzdGVuZXIuYXBwbHkodGhhdCwgYXJncyk7XG4gIH0gZmluYWxseSB7XG4gICAgZXZlbnQgPSBldmVudDA7XG4gIH1cbn1cbiIsImltcG9ydCBkZWZhdWx0VmlldyBmcm9tIFwiLi4vd2luZG93XCI7XG5cbmZ1bmN0aW9uIGRpc3BhdGNoRXZlbnQobm9kZSwgdHlwZSwgcGFyYW1zKSB7XG4gIHZhciB3aW5kb3cgPSBkZWZhdWx0Vmlldyhub2RlKSxcbiAgICAgIGV2ZW50ID0gd2luZG93LkN1c3RvbUV2ZW50O1xuXG4gIGlmICh0eXBlb2YgZXZlbnQgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIGV2ZW50ID0gbmV3IGV2ZW50KHR5cGUsIHBhcmFtcyk7XG4gIH0gZWxzZSB7XG4gICAgZXZlbnQgPSB3aW5kb3cuZG9jdW1lbnQuY3JlYXRlRXZlbnQoXCJFdmVudFwiKTtcbiAgICBpZiAocGFyYW1zKSBldmVudC5pbml0RXZlbnQodHlwZSwgcGFyYW1zLmJ1YmJsZXMsIHBhcmFtcy5jYW5jZWxhYmxlKSwgZXZlbnQuZGV0YWlsID0gcGFyYW1zLmRldGFpbDtcbiAgICBlbHNlIGV2ZW50LmluaXRFdmVudCh0eXBlLCBmYWxzZSwgZmFsc2UpO1xuICB9XG5cbiAgbm9kZS5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbn1cblxuZnVuY3Rpb24gZGlzcGF0Y2hDb25zdGFudCh0eXBlLCBwYXJhbXMpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBkaXNwYXRjaEV2ZW50KHRoaXMsIHR5cGUsIHBhcmFtcyk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGRpc3BhdGNoRnVuY3Rpb24odHlwZSwgcGFyYW1zKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gZGlzcGF0Y2hFdmVudCh0aGlzLCB0eXBlLCBwYXJhbXMuYXBwbHkodGhpcywgYXJndW1lbnRzKSk7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHR5cGUsIHBhcmFtcykge1xuICByZXR1cm4gdGhpcy5lYWNoKCh0eXBlb2YgcGFyYW1zID09PSBcImZ1bmN0aW9uXCJcbiAgICAgID8gZGlzcGF0Y2hGdW5jdGlvblxuICAgICAgOiBkaXNwYXRjaENvbnN0YW50KSh0eXBlLCBwYXJhbXMpKTtcbn1cbiIsImltcG9ydCBzZWxlY3Rpb25fc2VsZWN0IGZyb20gXCIuL3NlbGVjdFwiO1xuaW1wb3J0IHNlbGVjdGlvbl9zZWxlY3RBbGwgZnJvbSBcIi4vc2VsZWN0QWxsXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2ZpbHRlciBmcm9tIFwiLi9maWx0ZXJcIjtcbmltcG9ydCBzZWxlY3Rpb25fZGF0YSBmcm9tIFwiLi9kYXRhXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2VudGVyIGZyb20gXCIuL2VudGVyXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2V4aXQgZnJvbSBcIi4vZXhpdFwiO1xuaW1wb3J0IHNlbGVjdGlvbl9tZXJnZSBmcm9tIFwiLi9tZXJnZVwiO1xuaW1wb3J0IHNlbGVjdGlvbl9vcmRlciBmcm9tIFwiLi9vcmRlclwiO1xuaW1wb3J0IHNlbGVjdGlvbl9zb3J0IGZyb20gXCIuL3NvcnRcIjtcbmltcG9ydCBzZWxlY3Rpb25fY2FsbCBmcm9tIFwiLi9jYWxsXCI7XG5pbXBvcnQgc2VsZWN0aW9uX25vZGVzIGZyb20gXCIuL25vZGVzXCI7XG5pbXBvcnQgc2VsZWN0aW9uX25vZGUgZnJvbSBcIi4vbm9kZVwiO1xuaW1wb3J0IHNlbGVjdGlvbl9zaXplIGZyb20gXCIuL3NpemVcIjtcbmltcG9ydCBzZWxlY3Rpb25fZW1wdHkgZnJvbSBcIi4vZW1wdHlcIjtcbmltcG9ydCBzZWxlY3Rpb25fZWFjaCBmcm9tIFwiLi9lYWNoXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2F0dHIgZnJvbSBcIi4vYXR0clwiO1xuaW1wb3J0IHNlbGVjdGlvbl9zdHlsZSBmcm9tIFwiLi9zdHlsZVwiO1xuaW1wb3J0IHNlbGVjdGlvbl9wcm9wZXJ0eSBmcm9tIFwiLi9wcm9wZXJ0eVwiO1xuaW1wb3J0IHNlbGVjdGlvbl9jbGFzc2VkIGZyb20gXCIuL2NsYXNzZWRcIjtcbmltcG9ydCBzZWxlY3Rpb25fdGV4dCBmcm9tIFwiLi90ZXh0XCI7XG5pbXBvcnQgc2VsZWN0aW9uX2h0bWwgZnJvbSBcIi4vaHRtbFwiO1xuaW1wb3J0IHNlbGVjdGlvbl9yYWlzZSBmcm9tIFwiLi9yYWlzZVwiO1xuaW1wb3J0IHNlbGVjdGlvbl9sb3dlciBmcm9tIFwiLi9sb3dlclwiO1xuaW1wb3J0IHNlbGVjdGlvbl9hcHBlbmQgZnJvbSBcIi4vYXBwZW5kXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2luc2VydCBmcm9tIFwiLi9pbnNlcnRcIjtcbmltcG9ydCBzZWxlY3Rpb25fcmVtb3ZlIGZyb20gXCIuL3JlbW92ZVwiO1xuaW1wb3J0IHNlbGVjdGlvbl9jbG9uZSBmcm9tIFwiLi9jbG9uZVwiO1xuaW1wb3J0IHNlbGVjdGlvbl9kYXR1bSBmcm9tIFwiLi9kYXR1bVwiO1xuaW1wb3J0IHNlbGVjdGlvbl9vbiBmcm9tIFwiLi9vblwiO1xuaW1wb3J0IHNlbGVjdGlvbl9kaXNwYXRjaCBmcm9tIFwiLi9kaXNwYXRjaFwiO1xuXG5leHBvcnQgdmFyIHJvb3QgPSBbbnVsbF07XG5cbmV4cG9ydCBmdW5jdGlvbiBTZWxlY3Rpb24oZ3JvdXBzLCBwYXJlbnRzKSB7XG4gIHRoaXMuX2dyb3VwcyA9IGdyb3VwcztcbiAgdGhpcy5fcGFyZW50cyA9IHBhcmVudHM7XG59XG5cbmZ1bmN0aW9uIHNlbGVjdGlvbigpIHtcbiAgcmV0dXJuIG5ldyBTZWxlY3Rpb24oW1tkb2N1bWVudC5kb2N1bWVudEVsZW1lbnRdXSwgcm9vdCk7XG59XG5cblNlbGVjdGlvbi5wcm90b3R5cGUgPSBzZWxlY3Rpb24ucHJvdG90eXBlID0ge1xuICBjb25zdHJ1Y3RvcjogU2VsZWN0aW9uLFxuICBzZWxlY3Q6IHNlbGVjdGlvbl9zZWxlY3QsXG4gIHNlbGVjdEFsbDogc2VsZWN0aW9uX3NlbGVjdEFsbCxcbiAgZmlsdGVyOiBzZWxlY3Rpb25fZmlsdGVyLFxuICBkYXRhOiBzZWxlY3Rpb25fZGF0YSxcbiAgZW50ZXI6IHNlbGVjdGlvbl9lbnRlcixcbiAgZXhpdDogc2VsZWN0aW9uX2V4aXQsXG4gIG1lcmdlOiBzZWxlY3Rpb25fbWVyZ2UsXG4gIG9yZGVyOiBzZWxlY3Rpb25fb3JkZXIsXG4gIHNvcnQ6IHNlbGVjdGlvbl9zb3J0LFxuICBjYWxsOiBzZWxlY3Rpb25fY2FsbCxcbiAgbm9kZXM6IHNlbGVjdGlvbl9ub2RlcyxcbiAgbm9kZTogc2VsZWN0aW9uX25vZGUsXG4gIHNpemU6IHNlbGVjdGlvbl9zaXplLFxuICBlbXB0eTogc2VsZWN0aW9uX2VtcHR5LFxuICBlYWNoOiBzZWxlY3Rpb25fZWFjaCxcbiAgYXR0cjogc2VsZWN0aW9uX2F0dHIsXG4gIHN0eWxlOiBzZWxlY3Rpb25fc3R5bGUsXG4gIHByb3BlcnR5OiBzZWxlY3Rpb25fcHJvcGVydHksXG4gIGNsYXNzZWQ6IHNlbGVjdGlvbl9jbGFzc2VkLFxuICB0ZXh0OiBzZWxlY3Rpb25fdGV4dCxcbiAgaHRtbDogc2VsZWN0aW9uX2h0bWwsXG4gIHJhaXNlOiBzZWxlY3Rpb25fcmFpc2UsXG4gIGxvd2VyOiBzZWxlY3Rpb25fbG93ZXIsXG4gIGFwcGVuZDogc2VsZWN0aW9uX2FwcGVuZCxcbiAgaW5zZXJ0OiBzZWxlY3Rpb25faW5zZXJ0LFxuICByZW1vdmU6IHNlbGVjdGlvbl9yZW1vdmUsXG4gIGNsb25lOiBzZWxlY3Rpb25fY2xvbmUsXG4gIGRhdHVtOiBzZWxlY3Rpb25fZGF0dW0sXG4gIG9uOiBzZWxlY3Rpb25fb24sXG4gIGRpc3BhdGNoOiBzZWxlY3Rpb25fZGlzcGF0Y2hcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHNlbGVjdGlvbjtcbiIsImltcG9ydCB7U2VsZWN0aW9uLCByb290fSBmcm9tIFwiLi9zZWxlY3Rpb24vaW5kZXhcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oc2VsZWN0b3IpIHtcbiAgcmV0dXJuIHR5cGVvZiBzZWxlY3RvciA9PT0gXCJzdHJpbmdcIlxuICAgICAgPyBuZXcgU2VsZWN0aW9uKFtbZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3RvcildXSwgW2RvY3VtZW50LmRvY3VtZW50RWxlbWVudF0pXG4gICAgICA6IG5ldyBTZWxlY3Rpb24oW1tzZWxlY3Rvcl1dLCByb290KTtcbn1cbiIsIlwidXNlIHN0cmljdFwiO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0R3RleFVybHMoKXtcbiAgICBjb25zdCBob3N0ID0gXCJodHRwczovL2d0ZXhwb3J0YWwub3JnL3Jlc3QvdjEvXCI7IC8vIE5PVEU6IHRvcCBleHByZXNzZWQgZ2VuZXMgYXJlIG5vdCB5ZXQgaW4gcHJvZHVjdGlvblxuICAgIHJldHVybiB7XG4gICAgICAgIC8vIFwiZ2VuZUV4cFwiOiBcImh0dHBzOi8vZ3RleHBvcnRhbC5vcmcvcmVzdC92MS9kYXRhc2V0L2ZlYXR1cmVFeHByZXNzaW9uP2ZlYXR1cmU9Z2VuZSZnZW5jb2RlX2lkPVwiLFxuXG4gICAgICAgIC8vIFwic2FtcGxlXCI6IGhvc3QgKyBcImRhdGFzZXQvc2FtcGxlP2RhdGFzZXRJZD1ndGV4X3Y3JmZvcm1hdD1qc29uJnNvcnRfYnk9c2FtcGxlSWQmc29ydERpcj1hc2MmZGF0YVR5cGU9XCIsXG4gICAgICAgIFwicm5hc2VxQ3JhbVwiOiBcImRhdGEvcm5hc2VxX2NyYW1fZmlsZXNfdjdfZGJHYVBfMDExNTE2LnR4dFwiLFxuICAgICAgICBcIndnc0NyYW1cIjogXCJkYXRhL3dnc19jcmFtX2ZpbGVzX3Y3X2hnMzhfZGJHYVBfMDExNTE2LnR4dFwiLFxuICAgICAgICBcInNhbXBsZVwiOiBcImRhdGEvZ3RleC5TYW1wbGUuY3N2XCIsXG4gICAgICAgIFwiZ2VuZUlkXCI6IGhvc3QgKyBcInJlZmVyZW5jZS9nZW5lSWQ/Zm9ybWF0PWpzb24mZ2VuZUlkPVwiLFxuICAgICAgICBcImdlbmVFeHBcIjogaG9zdCArIFwiZXhwcmVzc2lvbi9nZW5lRXhwcmVzc2lvbj9kYXRhc2V0SWQ9Z3RleF92NyZnZW5jb2RlSWQ9XCIsXG4gICAgICAgIFwidGlzc3VlXCI6ICBob3N0ICsgXCJkYXRhc2V0L3Rpc3N1ZUluZm9cIixcbiAgICAgICAgXCJ0b3BJblRpc3N1ZUZpbHRlcmVkXCI6IGhvc3QgKyBcImV4cHJlc3Npb24vdG9wRXhwcmVzc2VkR2VuZXM/ZGF0YXNldElkPWd0ZXhfdjcmZmlsdGVyTXRHZW5lPXRydWUmc29ydF9ieT1tZWRpYW4mc29ydERpcmVjdGlvbj1kZXNjJnBhZ2Vfc2l6ZT01MCZ0aXNzdWVJZD1cIixcbiAgICAgICAgXCJ0b3BJblRpc3N1ZVwiOiBob3N0ICsgXCJleHByZXNzaW9uL3RvcEV4cHJlc3NlZEdlbmVzP2RhdGFzZXRJZD1ndGV4X3Y3JnNvcnRfYnk9bWVkaWFuJnNvcnREaXJlY3Rpb249ZGVzYyZwYWdlX3NpemU9NTAmdGlzc3VlSWQ9XCIsXG4gICAgICAgIFwibWVkRXhwQnlJZFwiOiBob3N0ICsgXCJleHByZXNzaW9uL21lZGlhbkdlbmVFeHByZXNzaW9uP2RhdGFzZXRJZD1ndGV4X3Y3JmhjbHVzdGVyPXRydWUmcGFnZV9zaXplPTEwMDAwJmdlbmNvZGVJZD1cIixcblxuICAgICAgICBcImV4b25FeHBcIjogaG9zdCArIFwiZXhwcmVzc2lvbi9tZWRpYW5FeG9uRXhwcmVzc2lvbj9kYXRhc2V0SWQ9Z3RleF92NyZoY2x1c3Rlcj10cnVlJmdlbmNvZGVJZD1cIixcbiAgICAgICAgXCJqdW5jdGlvbkV4cFwiOiBob3N0ICsgXCJleHByZXNzaW9uL21lZGlhbkp1bmN0aW9uRXhwcmVzc2lvbj9kYXRhc2V0SWQ9Z3RleF92NyZoY2x1c3Rlcj10cnVlJmdlbmNvZGVJZD1cIixcbiAgICAgICAgXCJpc29mb3JtRXhwXCI6IGhvc3QgKyBcImV4cHJlc3Npb24vaXNvZm9ybUV4cHJlc3Npb24/ZGF0YXNldElkPWd0ZXhfdjcmYm94cGxvdERldGFpbD1tZWRpYW4mZ2VuY29kZUlkPVwiLFxuXG4gICAgICAgIFwiZ2VuZU1vZGVsXCI6IGhvc3QgKyBcInJlZmVyZW5jZS9jb2xsYXBzZWRHZW5lTW9kZWw/dW5maWx0ZXJlZD1mYWxzZSZyZWxlYXNlPXY3JmdlbmVJZD1cIixcbiAgICAgICAgXCJnZW5lTW9kZWxVbmZpbHRlcmVkXCI6IGhvc3QgKyBcInJlZmVyZW5jZS9jb2xsYXBzZWRHZW5lTW9kZWw/dW5maWx0ZXJlZD10cnVlJnJlbGVhc2U9djcmZ2VuZUlkPVwiLFxuICAgICAgICBcImlzb2Zvcm1cIjogaG9zdCArIFwicmVmZXJlbmNlL3RyYW5zY3JpcHQ/cmVsZWFzZT12NyZnZW5jb2RlX2lkPVwiLFxuXG4gICAgICAgIFwibGl2ZXJHZW5lRXhwXCI6IFwiZGF0YS90b3A1MC5nZW5lcy5saXZlci5nZW5vbWljLm1lZGlhbi50cG0uanNvblwiLCAvLyB0b3AgNTAgZ2VuZXMgaW4gR1RFeCBsaXZlclxuICAgICAgICBcImNlcmViZWxsdW1HZW5lRXhwXCI6IFwiZGF0YS90b3AuZ3RleC5jZXJlYmVsbHVtLmdlbmVzLm1lZGlhbi50cG0udHN2XCIsXG4gICAgICAgIFwibWF5b0dlbmVFeHBcIjogXCJkYXRhL2d0ZXgrbWF5by50b3AuY2VyZWJlbGx1bV9hZC5nZW5lcy5tZWRpYW4udHBtLnRzdlwiIC8vIHRoZSB0b3AgNTAgZ2VuZXMgaW4gTWF5byBDZXJlYmVsbHVtX0FEICsgdGhlaXIgZ3RleCBleHByZXNzaW9uIHZhbHVlc1xuICAgIH1cbn1cblxuLyoqXG4gKiBQYXJzZSB0aGUgZ2VuZXMgZnJvbSBHVEV4IHdlYiBzZXJ2aWNlXG4gKiBAcGFyYW0gZGF0YSB7SnNvbn1cbiAqIEByZXR1cm5zIHtMaXN0fSBvZiBnZW5lc1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VHZW5lcyhkYXRhKXtcbiAgICBjb25zdCBhdHRyID0gXCJnZW5lSWRcIjtcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3cgXCJHZW5lIHdlYiBzZXJ2aWNlIHBhcnNpbmcgZXJyb3JcIjtcbiAgICByZXR1cm4gZGF0YVthdHRyXTtcbn1cblxuLyoqXG4gKiBwYXJzZSB0aGUgdGlzc3Vlc1xuICogQHBhcmFtIGRhdGEge0pzb259XG4gKiBAcmV0dXJucyB7TGlzdH0gb2YgdGlzc3Vlc1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VUaXNzdWVzKGRhdGEpe1xuICAgIGNvbnN0IGF0dHIgPSBcInRpc3N1ZUluZm9cIjtcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3cgXCJGYXRhbCBFcnJvcjogcGFyc2VUaXNzdWVzIGlucHV0IGVycm9yLlwiO1xuICAgIGNvbnN0IHRpc3N1ZXMgPSBkYXRhW2F0dHJdO1xuXG4gICAgLy8gc2FuaXR5IGNoZWNrXG4gICAgW1widGlzc3VlSWRcIiwgXCJ0aXNzdWVOYW1lXCIsIFwiY29sb3JIZXhcIl0uZm9yRWFjaCgoZCk9PntcbiAgICAgICAgaWYgKCF0aXNzdWVzWzBdLmhhc093blByb3BlcnR5KGQpKSB0aHJvdyBcIkZhdGFsIEVycm9yOiBwYXJzZVRpc3N1ZSBhdHRyIG5vdCBmb3VuZDogXCIgKyBkO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHRpc3N1ZXM7XG59XG5cbi8qKlxuICogcGFyc2UgdGhlIGV4b25zXG4gKiBAcGFyYW0gZGF0YSB7SnNvbn1cbiAqIEByZXR1cm5zIHtMaXN0fSBvZiBleG9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VFeG9ucyhkYXRhKXtcbiAgICBjb25zdCBhdHRyID0gXCJjb2xsYXBzZWRHZW5lTW9kZWxcIjtcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3cgXCJGYXRhbCBFcnJvcjogcGFyc2VFeG9ucyBpbnB1dCBlcnJvci5cIiArIGRhdGE7XG4gICAgLy8gc2FuaXR5IGNoZWNrXG4gICAgW1wiZmVhdHVyZVR5cGVcIiwgXCJzdGFydFwiLCBcImVuZFwiXS5mb3JFYWNoKChkKT0+e1xuICAgICAgICBpZiAoIWRhdGFbYXR0cl1bMF0uaGFzT3duUHJvcGVydHkoZCkpIHRocm93IFwiRmF0YWwgRXJyb3I6IHBhcnNlRXhvbnMgYXR0ciBub3QgZm91bmQ6IFwiICsgZDtcbiAgICB9KTtcbiAgICByZXR1cm4gZGF0YVthdHRyXS5maWx0ZXIoKGQpPT5kLmZlYXR1cmVUeXBlID09IFwiZXhvblwiKS5tYXAoKGQpPT57XG4gICAgICAgIGQuY2hyb21TdGFydCA9IGQuc3RhcnQ7XG4gICAgICAgIGQuY2hyb21FbmQgPSBkLmVuZDtcbiAgICAgICAgcmV0dXJuIGQ7XG4gICAgfSk7XG59XG5cbi8vIGV4cG9ydCBmdW5jdGlvbiBwYXJzZVNhbXBsZXMoZGF0YSl7XG4vLyAgICAgY29uc3QgYXR0ciA9IFwic2FtcGxlXCI7XG4vLyAgICAgaWYgKCFkYXRhLmhhc093blByb3BlcnR5KGF0dHIpKSB0aHJvdyBcIkZhdGFsIEVycm9yOiBwYXJzZVNhbXBsZXMgaW5wdXQgZXJyb3IuIFwiICsgZGF0YTtcbi8vICAgICByZXR1cm4gZGF0YVthdHRyXTtcbi8vIH1cbi8vXG5cblxuLyoqXG4gKiBwYXJzZSB0aGUganVuY3Rpb25zXG4gKiBAcGFyYW0gZGF0YVxuICogQHJldHVybnMge0xpc3R9IG9mIGp1bmN0aW9uc1xuICogLy8gd2UgZG8gbm90IHN0b3JlIGp1bmN0aW9uIHN0cnVjdHVyZSBhbm5vdGF0aW9ucyBpbiBNb25nb1xuICAgIC8vIHNvIGhlcmUgd2UgdXNlIHRoZSBqdW5jdGlvbiBleHByZXNzaW9uIHdlYiBzZXJ2aWNlIHRvIHJldHJpZXZlIHRoZSBqdW5jdGlvbiBnZW5vbWljIGxvY2F0aW9uc1xuICAgIC8vIGFzc3VtaW5nIHRoYXQgZWFjaCB0aXNzdWUgaGFzIHRoZSBzYW1lIGp1bmN0aW9ucyxcbiAgICAvLyB0byBncmFiIGFsbCB0aGUga25vd24ganVuY3Rpb25zIG9mIGEgZ2VuZSwgd2Ugb25seSBuZWVkIHRvIGxvb2sgYXQgb25lIHRpc3N1ZVxuICAgIC8vIGhlcmUgd2UgYXJiaXRyYXJpbHkgcGljayBMaXZlci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlSnVuY3Rpb25zKGRhdGEpe1xuXG4gICAgY29uc3QgYXR0ciA9IFwibWVkaWFuSnVuY3Rpb25FeHByZXNzaW9uXCI7XG4gICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93IFwiRmF0YWwgRXJyb3I6IHBhcnNlSnVuY3Rpb25zIGlucHV0IGVycm9yLiBcIiArIGRhdGE7XG4gICAgcmV0dXJuIGRhdGFbYXR0cl0uZmlsdGVyKChkKT0+ZC50aXNzdWVJZD09XCJMaXZlclwiKVxuICAgICAgICAgICAgICAgICAgICAubWFwKChkKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgcG9zID0gZC5qdW5jdGlvbklkLnNwbGl0KFwiX1wiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hyb206IHBvc1swXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaHJvbVN0YXJ0OiBwb3NbMV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hyb21FbmQ6IHBvc1syXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBqdW5jdGlvbklkOiBkLmp1bmN0aW9uSWRcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG59XG5cbi8qKlxuICogcGFyc2UgdHJhbnNjcmlwdCBpc29mb3JtcyBmcm9tIHRoZSBHVEV4IHdlYiBzZXJ2aWNlOiBcInJlZmVyZW5jZS90cmFuc2NyaXB0P3JlbGVhc2U9djcmZ2VuY29kZV9pZD1cIlxuICogQHBhcmFtIGRhdGEge0pzb259XG4gKiByZXR1cm5zIGEgZGljdGlvbmFyeSBvZiB0cmFuc2NyaXB0IGV4b24gb2JqZWN0IGxpc3RzIGluZGV4ZWQgYnkgRU5TVCBJRHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlSXNvZm9ybUV4b25zKGRhdGEpe1xuICAgIGNvbnN0IGF0dHIgPSBcInRyYW5zY3JpcHRcIjtcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3cgXCJwYXJzZUlzb2Zvcm1zIGlucHV0IGVycm9yIFwiICsgZGF0YTtcbiAgICByZXR1cm4gZGF0YVthdHRyXS5maWx0ZXIoKGQpPT57cmV0dXJuIFwiZXhvblwiID09IGQuZmVhdHVyZVR5cGV9KVxuICAgICAgICAucmVkdWNlKChhLCBkKT0+e1xuICAgICAgICBpZiAoYVtkLnRyYW5zY3JpcHRJZF0gPT09IHVuZGVmaW5lZCkgYVtkLnRyYW5zY3JpcHRJZF0gPSBbXTtcbiAgICAgICAgYVtkLnRyYW5zY3JpcHRJZF0ucHVzaChkKTtcbiAgICAgICAgcmV0dXJuIGE7XG4gICAgfSwge30pO1xufVxuXG4vKipcbiAqIHBhcnNlIHRyYW5zY3JpcHQgaXNvZm9ybXNcbiAqIEBwYXJhbSBkYXRhIHtKc29ufSBmcm9tIEdURXggd2ViIHNlcnZpY2UgXCJyZWZlcmVuY2UvdHJhbnNjcmlwdD9yZWxlYXNlPXY3JmdlbmNvZGVfaWQ9XCJcbiAqIHJldHVybnMgYSBsaXN0IG9mIGlzb2Zvcm0gb2JqZWN0c1xuICovXG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUlzb2Zvcm1zKGRhdGEpe1xuICAgIGNvbnN0IGF0dHIgPSBcInRyYW5zY3JpcHRcIjtcbiAgICBpZighZGF0YS5oYXNPd25Qcm9wZXJ0eShhdHRyKSkgdGhyb3coXCJwYXJzZUlzb2Zvcm1zIGlucHV0IGVycm9yXCIpO1xuICAgIHJldHVybiBkYXRhW2F0dHJdLmZpbHRlcigoZCk9PntyZXR1cm4gXCJ0cmFuc2NyaXB0XCIgPT0gZC5mZWF0dXJlVHlwZX0pLnNvcnQoKGEsIGIpPT57XG4gICAgICAgIGNvbnN0IGwxID0gTWF0aC5hYnMoYS5jaHJvbUVuZCAtIGEuY2hyb21TdGFydCkgKyAxO1xuICAgICAgICBjb25zdCBsMiA9IE1hdGguYWJzKGIuY2hyb21FbmQgLSBiLmNocm9tU3RhcnQpICsgMTtcbiAgICAgICAgcmV0dXJuIC0obDEtbDIpOyAvLyBzb3J0IGJ5IGlzb2Zvcm0gbGVuZ3RoIGluIGRlc2NlbmRpbmcgb3JkZXJcbiAgICB9KTtcbn1cblxuLyoqXG4gKiBwYXJzZSBmaW5hbCBnZW5lIG1vZGVsIGV4b24gZXhwcmVzc2lvblxuICogZXhwcmVzc2lvbiBpcyBub3JtYWxpemVkIHRvIHJlYWRzIHBlciBrYlxuICogQHBhcmFtIGRhdGEge0pTT059IG9mIGV4b24gZXhwcmVzc2lvbiB3ZWIgc2VydmljZVxuICogQHBhcmFtIGV4b25zIHtMaXN0fSBvZiBleG9ucyB3aXRoIHBvc2l0aW9uc1xuICogQHBhcmFtIHVzZUxvZyB7Ym9vbGVhbn0gdXNlIGxvZzIgdHJhbnNmb3JtYXRpb25cbiAqIEBwYXJhbSBhZGp1c3Qge051bWJlcn0gZGVmYXVsdCAwLjAxXG4gKiBAcmV0dXJucyB7TGlzdH0gb2YgZXhvbiBvYmplY3RzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUV4b25FeHByZXNzaW9uKGRhdGEsIGV4b25zLCB1c2VMb2c9dHJ1ZSwgYWRqdXN0PTEpe1xuICAgIGNvbnN0IGV4b25EaWN0ID0gZXhvbnMucmVkdWNlKChhLCBkKT0+e2FbZC5leG9uSWRdID0gZDsgcmV0dXJuIGE7fSwge30pO1xuICAgIGNvbnN0IGF0dHIgPSBcIm1lZGlhbkV4b25FeHByZXNzaW9uXCI7XG4gICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93KFwicGFyc2VFeG9uRXhwcmVzc2lvbiBpbnB1dCBlcnJvclwiKTtcblxuICAgIGNvbnN0IGV4b25PYmplY3RzID0gZGF0YVthdHRyXTtcbiAgICAvLyBlcnJvci1jaGVja2luZ1xuICAgIFtcImRhdGFcIiwgXCJleG9uSWRcIiwgXCJ0aXNzdWVJZFwiXS5mb3JFYWNoKChkKT0+e1xuICAgICAgICBpZiAoIWV4b25PYmplY3RzWzBdLmhhc093blByb3BlcnR5KGQpKSB0aHJvdyBcIkZhdGFsIEVycm9yOiBwYXJzZUV4b25FeHByZXNzaW9uIGF0dHIgbm90IGZvdW5kOiBcIiArIGQ7XG4gICAgfSk7XG4gICAgLy8gcGFyc2UgR1RFeCBtZWRpYW4gZXhvbiBjb3VudHNcbiAgICBleG9uT2JqZWN0cy5mb3JFYWNoKChkKSA9PiB7XG4gICAgICAgIGNvbnN0IGV4b24gPSBleG9uRGljdFtkLmV4b25JZF07IC8vIGZvciByZXRyaWV2aW5nIGV4b24gcG9zaXRpb25zXG4gICAgICAgIC8vIGVycm9yLWNoZWNraW5nXG4gICAgICAgIFtcImVuZFwiLCBcInN0YXJ0XCJdLmZvckVhY2goKHApPT57XG4gICAgICAgICAgICBpZiAoIWV4b24uaGFzT3duUHJvcGVydHkocCkpIHRocm93IFwiRmF0YWwgRXJyb3I6IHBhcnNlRXhvbkV4cHJlc3Npb24gYXR0ciBub3QgZm91bmQ6IFwiICsgcDtcbiAgICAgICAgfSk7XG4gICAgICAgIGQubCA9IGV4b24uZW5kIC0gZXhvbi5zdGFydCArIDE7XG4gICAgICAgIGQudmFsdWUgPSBOdW1iZXIoZC5kYXRhKS9kLmw7XG4gICAgICAgIGQub3JpZ2luYWxWYWx1ZSA9IE51bWJlcihkLmRhdGEpL2QubDtcbiAgICAgICAgaWYgKHVzZUxvZykgZC52YWx1ZSA9IE1hdGgubG9nMihkLnZhbHVlICsgMSk7XG4gICAgICAgIGQueCA9IGQuZXhvbklkO1xuICAgICAgICBkLnkgPSBkLnRpc3N1ZUlkO1xuICAgICAgICBkLmlkID0gZC5nZW5jb2RlSWQ7XG4gICAgICAgIGQuY2hyb21TdGFydCA9IGV4b24uc3RhcnQ7XG4gICAgICAgIGQuY2hyb21FbmQgPSBleG9uLmVuZDtcbiAgICAgICAgZC51bml0ID0gZC51bml0ICsgXCIgcGVyIGJhc2VcIjtcbiAgICB9KTtcbiAgICByZXR1cm4gZXhvbk9iamVjdHMuc29ydCgoYSxiKT0+e1xuICAgICAgICBpZiAoYS5jaHJvbVN0YXJ0PGIuY2hyb21TdGFydCkgcmV0dXJuIC0xO1xuICAgICAgICBpZiAoYS5jaHJvbVN0YXJ0PmIuY2hyb21TdGFydCkgcmV0dXJuIDE7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH0pOyAvLyBzb3J0IGJ5IGdlbm9taWMgbG9jYXRpb24gaW4gYXNjZW5kaW5nIG9yZGVyXG59XG5cbi8qKlxuICogUGFyc2UganVuY3Rpb24gbWVkaWFuIHJlYWQgY291bnQgZGF0YVxuICogQHBhcmFtIGRhdGEge0pTT059IG9mIHRoZSBqdW5jdGlvbiBleHByZXNzaW9uIHdlYiBzZXJ2aWNlXG4gKiBAcGFyYW0gdXNlTG9nIHtCb29sZWFufSBwZXJmb3JtIGxvZyB0cmFuc2Zvcm1hdGlvblxuICogQHBhcmFtIGFkanVzdCB7TnVtYmVyfSBmb3IgaGFuZGxpbmcgMCdzIHdoZW4gdXNlTG9nIGlzIHRydWVcbiAqIEByZXR1cm5zIHtMaXN0fSBvZiBqdW5jdGlvbiBvYmplY3RzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUp1bmN0aW9uRXhwcmVzc2lvbihkYXRhLCB1c2VMb2c9dHJ1ZSwgYWRqdXN0PTEpe1xuICAgIGNvbnN0IGF0dHIgPSBcIm1lZGlhbkp1bmN0aW9uRXhwcmVzc2lvblwiO1xuICAgIGlmKCFkYXRhLmhhc093blByb3BlcnR5KGF0dHIpKSB0aHJvdyhcInBhcnNlSnVuY3Rpb25FeHByZXNzaW9uIGlucHV0IGVycm9yXCIpO1xuXG4gICAgY29uc3QganVuY3Rpb25zID0gZGF0YVthdHRyXTtcblxuICAgIC8vIGVycm9yLWNoZWNraW5nXG4gICAgW1widGlzc3VlSWRcIiwgXCJqdW5jdGlvbklkXCIsIFwiZGF0YVwiLCBcImdlbmNvZGVJZFwiXS5mb3JFYWNoKChkKT0+e1xuICAgICAgICBpZiAoIWp1bmN0aW9uc1swXS5oYXNPd25Qcm9wZXJ0eShkKSkgdGhyb3cgXCJGYXRhbCBFcnJvcjogcGFyc2VKdW5jdGlvbkV4cHJlc3Npb24gYXR0ciBub3QgZm91bmQ6IFwiICsgZDtcbiAgICB9KTtcblxuICAgIC8vIHBhcnNlIEdURXggbWVkaWFuIGp1bmN0aW9uIHJlYWQgY291bnRzXG4gICAganVuY3Rpb25zLmZvckVhY2goKGQpID0+IHtcbiAgICAgICAgZC52YWx1ZSA9IHVzZUxvZz9NYXRoLmxvZzEwKE51bWJlcihkLmRhdGEgKyBhZGp1c3QpKTpOdW1iZXIoZC5kYXRhKTtcbiAgICAgICAgZC54ID0gZC5qdW5jdGlvbklkO1xuICAgICAgICBkLnkgPSBkLnRpc3N1ZUlkO1xuICAgICAgICBkLm9yaWdpbmFsVmFsdWUgPSBOdW1iZXIoZC5kYXRhKTtcbiAgICAgICAgZC5pZCA9IGQuZ2VuY29kZUlkXG4gICAgfSk7XG5cbiAgICAvLyBzb3J0IGJ5IGdlbm9taWMgbG9jYXRpb24gaW4gYXNjZW5kaW5nIG9yZGVyXG4gICAgcmV0dXJuIGp1bmN0aW9ucy5zb3J0KChhLGIpPT57XG4gICAgICAgIGlmIChhLmp1bmN0aW9uSWQ+Yi5qdW5jdGlvbklkKSByZXR1cm4gMTtcbiAgICAgICAgZWxzZSBpZiAoYS5qdW5jdGlvbklkPGIuanVuY3Rpb25JZCkgcmV0dXJuIC0xO1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9KTtcbn1cblxuLyoqXG4gKiBwYXJzZSBpc29mb3JtIGV4cHJlc3Npb25cbiAqIEBwYXJhbSBkYXRhXG4gKiBAcGFyYW0gdXNlTG9nXG4gKiBAcGFyYW0gYWRqdXN0XG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlSXNvZm9ybUV4cHJlc3Npb24oZGF0YSwgdXNlTG9nPXRydWUsIGFkanVzdD0xKXtcbiAgICBjb25zdCBhdHRyID0gXCJpc29mb3JtRXhwcmVzc2lvblwiO1xuICAgIGlmKCFkYXRhLmhhc093blByb3BlcnR5KGF0dHIpKSB0aHJvdyhcInBhcnNlSXNvZm9ybUV4cHJlc3Npb24gaW5wdXQgZXJyb3JcIik7XG4gICAgLy8gcGFyc2UgR1RFeCBpc29mb3JtIG1lZGlhbiBUUE1cbiAgICBkYXRhW2F0dHJdLmZvckVhY2goKGQpID0+IHtcbiAgICAgICAgZC52YWx1ZSA9IHVzZUxvZz9NYXRoLmxvZzEwKE51bWJlcihkLmRhdGEgKyBhZGp1c3QpKTpOdW1iZXIoZC5kYXRhKTtcbiAgICAgICAgZC5vcmlnaW5hbFZhbHVlID0gTnVtYmVyKGQuZGF0YSk7XG4gICAgICAgIGQueCA9IGQudHJhbnNjcmlwdElkO1xuICAgICAgICBkLnkgPSBkLnRpc3N1ZUlkO1xuICAgICAgICBkLmlkID0gZC5nZW5jb2RlSWQ7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZGF0YVthdHRyXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlSXNvZm9ybUV4cHJlc3Npb25UcmFuc3Bvc2UoZGF0YSwgdXNlTG9nPXRydWUsIGFkanVzdD0xKXtcbiAgICBjb25zdCBhdHRyID0gXCJpc29mb3JtRXhwcmVzc2lvblwiO1xuICAgIGlmKCFkYXRhLmhhc093blByb3BlcnR5KGF0dHIpKSB0aHJvdyhcInBhcnNlSXNvZm9ybUV4cHJlc3Npb24gaW5wdXQgZXJyb3JcIik7XG4gICAgLy8gcGFyc2UgR1RFeCBpc29mb3JtIG1lZGlhbiBUUE1cbiAgICBkYXRhW2F0dHJdLmZvckVhY2goKGQpID0+IHtcbiAgICAgICAgZC52YWx1ZSA9IHVzZUxvZz9NYXRoLmxvZzEwKE51bWJlcihkLmRhdGEgKyBhZGp1c3QpKTpOdW1iZXIoZC5kYXRhKTtcbiAgICAgICAgZC5vcmlnaW5hbFZhbHVlID0gTnVtYmVyKGQuZGF0YSk7XG4gICAgICAgIGQueSA9IGQudHJhbnNjcmlwdElkO1xuICAgICAgICBkLnggPSBkLnRpc3N1ZUlkO1xuICAgICAgICBkLmlkID0gZC5nZW5jb2RlSWQ7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZGF0YVthdHRyXTtcbn1cblxuLyoqXG4gKiBwYXJzZSBtZWRpYW4gZ2VuZSBleHByZXNzaW9uXG4gKiBAcGFyYW0gZGF0YSB7SnNvbn0gd2l0aCBhdHRyIG1lZGlhbkdlbmVFeHByZXNzaW9uXG4gKiBAcGFyYW0gdXNlTG9nIHtCb29sZWFufSBwZXJmb3JtcyBsb2cxMCB0cmFuc2Zvcm1hdGlvblxuICogQHJldHVybnMgeyp9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZU1lZGlhbkV4cHJlc3Npb24oZGF0YSwgdXNlTG9nPXRydWUpe1xuICAgIGNvbnN0IGF0dHIgPSBcIm1lZGlhbkdlbmVFeHByZXNzaW9uXCI7XG4gICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93IFwicGFyc2VNZWRpYW5FeHByZXNzaW9uIGlucHV0IGVycm9yLlwiO1xuICAgIGNvbnN0IGFkanVzdCA9IDE7XG4gICAgLy8gcGFyc2UgR1RFeCBtZWRpYW4gZ2VuZSBleHByZXNzaW9uXG4gICAgLy8gZXJyb3ItY2hlY2tpbmcgdGhlIHJlcXVpcmVkIGF0dHJpYnV0ZXM6XG4gICAgaWYgKGRhdGFbYXR0cl0ubGVuZ3RoID09IDApIHRocm93IFwicGFyc2VNZWRpYW5FeHByZXNzaW9uIGZpbmRzIG5vIGRhdGEuXCI7XG4gICAgW1wibWVkaWFuXCIsIFwidGlzc3VlSWRcIiwgXCJnZW5jb2RlSWRcIl0uZm9yRWFjaCgoZCk9PntcbiAgICAgICAgaWYgKCFkYXRhW2F0dHJdWzBdLmhhc093blByb3BlcnR5KGQpKSB0aHJvdyBgcGFyc2VNZWRpYW5FeHByZXNzaW9uIGF0dHIgZXJyb3IuICR7ZH0gaXMgbm90IGZvdW5kYDtcbiAgICB9KTtcbiAgICBkYXRhLm1lZGlhbkdlbmVFeHByZXNzaW9uLmZvckVhY2goZnVuY3Rpb24oZCl7XG4gICAgICAgIGQudmFsdWUgPSB1c2VMb2c/TWF0aC5sb2cxMChOdW1iZXIoZC5tZWRpYW4pICsgYWRqdXN0KTpOdW1iZXIoZC5tZWRpYW4pO1xuICAgICAgICBkLnggPSBkLnRpc3N1ZUlkO1xuICAgICAgICBkLnkgPSBkLmdlbmNvZGVJZDtcbiAgICAgICAgZC5vcmlnaW5hbFZhbHVlID0gTnVtYmVyKGQubWVkaWFuKTtcbiAgICAgICAgZC5pZCA9IGQuZ2VuY29kZUlkXG4gICAgfSk7XG4gICAgcmV0dXJuIGRhdGFbYXR0cl07XG59XG5cbi8qKlxuICogcGFyc2UgdGhlIG1lZGlhbiBnZW5lIGV4cHJlc3Npb24sIG5vIGxvbmdlciBpbiB1c2VcbiAqIEBwYXJhbSBkYXRhIHtMaXN0fSBvZiBkYXRhIHBvaW50cyB3aXRoIGF0dHI6IHZhbHVlLCB0aXNzdWVJZCwgZ2VuZVN5bWJvbCwgZ2VuY29kZUlkXG4gKiBAcGFyYW0gdXNlTG9nIHtCb29sZWFufSBwZXJmb3JtIGxvZyB0cmFuc2Zvcm1hdGlvbiB1c2luZyBsb2cxMFxuICogQHJldHVybnMge0xpc3R9XG4gKi9cbi8vIGV4cG9ydCBmdW5jdGlvbiBwYXJzZU1lZGlhblRQTShkYXRhLCB1c2VMb2c9dHJ1ZSl7XG4vLyAgICAgLy8gcGFyc2UgR1RFeCBtZWRpYW4gVFBNIGpzb24gc3RhdGljIGZpbGVcbi8vICAgICBkYXRhLmZvckVhY2goZnVuY3Rpb24oZCl7XG4vLyAgICAgICAgIGQudmFsdWUgPSB1c2VMb2c/TWF0aC5sb2cxMCgrZC5tZWRpYW5UUE0gKyAxKTorZC5tZWRpYW5UUE07XG4vLyAgICAgICAgIGQueCA9IGQudGlzc3VlSWQ7XG4vLyAgICAgICAgIGQueSA9IGQuZ2VuZVN5bWJvbDtcbi8vICAgICAgICAgZC5vcmlnaW5hbFZhbHVlID0gcGFyc2VGbG9hdChkLm1lZGlhblRQTSk7XG4vLyAgICAgICAgIGQuaWQgPSBkLmdlbmNvZGVJZDtcbi8vICAgICB9KTtcbi8vICAgICByZXR1cm4gZGF0YTtcbi8vIH1cblxuLyoqXG4gKiBwYXJzZSB0aGUgZ2VuZSBleHByZXNzaW9uXG4gKiBAcGFyYW0gZ2VuY29kZUlkIHtTdHJpbmd9XG4gKiBAcGFyYW0gZGF0YSB7SnNvbn0gd2l0aCBhdHRyOiB0aXNzdWVJZCwgZ2VuZVN5bWJvbFxuICogQHJldHVybnMge3tleHA6IHt9LCBnZW5lU3ltYm9sOiBzdHJpbmd9fVxuICovXG5mdW5jdGlvbiBwYXJzZUdlbmVFeHByZXNzaW9uKGdlbmNvZGVJZCwgZGF0YSl7XG4gICAgbGV0IGxvb2t1cFRhYmxlID0ge1xuICAgICAgICBleHA6IHt9LCAvLyBpbmRleGVkIGJ5IHRpc3N1ZUlkXG4gICAgICAgIGdlbmVTeW1ib2w6IFwiXCJcbiAgICB9O1xuICAgIGlmKCFkYXRhLmhhc093blByb3BlcnR5KGF0dHIpKSB0aHJvdyAoXCJwYXJzZUdlbmVFeHByZXNzaW9uIGlucHV0IGVycm9yLlwiKTtcbiAgICBkYXRhW2F0dHJdLmZvckVhY2goKGQpPT57XG4gICAgICAgIGlmIChkLmdlbmNvZGVJZCA9PSBnZW5jb2RlSWQpIHtcbiAgICAgICAgICAgIC8vIGlmIHRoZSBnZW5jb2RlIElEIG1hdGNoZXMgdGhlIHF1ZXJ5IGdlbmNvZGVJZCxcbiAgICAgICAgICAgIC8vIGFkZCB0aGUgZXhwcmVzc2lvbiBkYXRhIHRvIHRoZSBsb29rdXAgdGFibGVcbiAgICAgICAgICAgIGxvb2t1cFRhYmxlLmV4cFtkLnRpc3N1ZUlkXSA9IGQuZGF0YTtcbiAgICAgICAgICAgIGlmIChcIlwiID09IGxvb2t1cFRhYmxlLmdlbmVTeW1ib2wpIGxvb2t1cFRhYmxlLmdlbmVTeW1ib2wgPSBkLmdlbmVTeW1ib2xcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBsb29rdXBUYWJsZVxufVxuXG4vKipcbiAqIE1ha2VzIHRoZSBqc29uIGZvciB0aGUgcGxvdGx5IGJveHBsb3QsIG5vIGxvbmdlciBpbiB1c2VcbiAqIEBwYXJhbSBnZW5jb2RlSWQge1N0cmluZ306IGEgZ2VuY29kZSBJRFxuICogQHBhcmFtIGRhdGEge09iamVjdH0gZ2VuZSBleHByZXNzaW9uIEFQSSBjYWxsXG4gKiBAcGFyYW0gdXNlTG9nIHtCb29sZWFufVxuICogQHBhcmFtIGNvbG9yIHtTdHJpbmd9XG4gKiBAcGFyYW0geGxpc3Qge0xpc3R9OiBhIGxpc3Qgb2YgdGlzc3VlIG9iamVjdHMge2lkOlN0cmluZywgbmFtZTpTdHJpbmd9XG4gKiBAcmV0dXJucyB7e3g6IEFycmF5LCB5OiBBcnJheSwgbmFtZTogc3RyaW5nLCB0eXBlOiBzdHJpbmcsIGxpbmU6IHt3aWR0aDogbnVtYmVyfSwgbWFya2VyOiB7Y29sb3I6IHN0cmluZ319fVxuICovXG4vLyBleHBvcnQgZnVuY3Rpb24gbWFrZUpzb25Gb3JQbG90bHkoZ2VuY29kZUlkLCBkYXRhLCB1c2VMb2c9ZmFsc2UsIGNvbG9yPVwiZ3JleVwiLCB4bGlzdCl7XG4vL1xuLy8gICAgIC8vIHJlZmVyZW5jZTogaHR0cHM6Ly9wbG90Lmx5L2phdmFzY3JpcHQvYm94LXBsb3RzL1xuLy9cbi8vICAgICBsZXQgbG9va3VwVGFibGUgPSBwYXJzZUdlbmVFeHByZXNzaW9uKGdlbmNvZGVJZCwgZGF0YSk7IC8vIGNvbnN0cnVjdHMgdGhlIHRpc3N1ZSBsb29rdXAgdGFibGUgaW5kZXhlZCBieSB0aXNzdWUgSURcbi8vICAgICBsZXQgeCA9IFtdO1xuLy8gICAgIGxldCB5ID0gW107XG4vL1xuLy8gICAgIC8vIHhsaXN0OiB0aGUgdGlzc3Vlc1xuLy8gICAgIHhsaXN0LmZvckVhY2goKGQpPT57XG4vLyAgICAgICAgIC8vIGQ6IGEgdGlzc3VlXG4vLyAgICAgICAgIGlmIChsb29rdXBUYWJsZS5leHBbZC5pZF09PT11bmRlZmluZWQpe1xuLy8gICAgICAgICAgICAgLy8gd2hlbiB0aGUgZ2VuZSBoYXMgbm8gZXhwcmVzc2lvbiBkYXRhIGluIHRpc3N1ZSBkLFxuLy8gICAgICAgICAgICAgLy8gcHJvdmlkZSBkdW1teSBkYXRhXG4vLyAgICAgICAgICAgICB4ID0geC5jb25jYXQoW2QubmFtZV0pO1xuLy8gICAgICAgICAgICAgeSA9IHkuY29uY2F0KFstMV0pO1xuLy8gICAgICAgICB9IGVsc2Uge1xuLy8gICAgICAgICAgICAgLy8gY29uY2F0ZW5hdGUgYSBsaXN0IG9mIHRoZSB0aXNzdWUgbGFiZWwgcmVwZWF0ZWRseSAobG9va3VwVGFibGUuZXhwW2RdLmxlbmd0aCB0aW1lcykgdG8geFxuLy8gICAgICAgICAgICAgLy8gY29uY2F0ZW5hdGUgYWxsIHRoZSBleHByZXNzaW9uIHZhbHVlcyB0byB5XG4vLyAgICAgICAgICAgICAvLyB0aGUgbnVtYmVyIG9mIGVsZW1lbnRzIGluIHggYW5kIHkgbXVzdCBtYXRjaFxuLy8gICAgICAgICAgICAgeCA9IHguY29uY2F0KEFycmF5KGxvb2t1cFRhYmxlLmV4cFtkLmlkXS5sZW5ndGgpLmZpbGwoZC5uYW1lKSk7XG4vLyAgICAgICAgICAgICB5ID0geS5jb25jYXQobG9va3VwVGFibGUuZXhwW2QuaWRdKTtcbi8vICAgICAgICAgfVxuLy8gICAgIH0pO1xuLy8gICAgIHJldHVybiB7XG4vLyAgICAgICAgIHg6IHgsXG4vLyAgICAgICAgIHk6IHksXG4vLyAgICAgICAgIG5hbWU6IGxvb2t1cFRhYmxlLmdlbmVTeW1ib2wsXG4vLyAgICAgICAgIHR5cGU6ICdib3gnLFxuLy8gICAgICAgICBsaW5lOiB7d2lkdGg6MX0sXG4vLyAgICAgICAgIG1hcmtlcjoge2NvbG9yOmNvbG9yfSxcbi8vICAgICB9O1xuLy9cbi8vIH1cblxuLyoqXG4gKiBwYXJzZSB0aGUgZXhwcmVzc2lvbiBkYXRhIG9mIGEgZ2VuZSBmb3IgYSBncm91cGVkIHZpb2xpbiBwbG90XG4gKiBAcGFyYW0gZGF0YSB7SlNPTn0gZnJvbSBHVEV4IGdlbmUgZXhwcmVzc2lvbiB3ZWIgc2VydmljZVxuICogQHBhcmFtIGNvbG9ycyB7RGljdGlvbmFyeX0gdGhlIHZpb2xpbiBjb2xvciBmb3IgZ2VuZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlR2VuZUV4cHJlc3Npb25Gb3JWaW9saW4oZGF0YSwgdXNlTG9nPXRydWUsIGNvbG9ycz11bmRlZmluZWQpe1xuICAgIGNvbnN0IGF0dHIgPSBcImdlbmVFeHByZXNzaW9uXCI7XG4gICAgaWYoIWRhdGEuaGFzT3duUHJvcGVydHkoYXR0cikpIHRocm93IFwicGFyc2VHZW5lRXhwcmVzc2lvbkZvclZpb2xpbiBpbnB1dCBlcnJvci5cIjtcbiAgICBkYXRhW2F0dHJdLmZvckVhY2goKGQpPT57XG4gICAgICAgIGQudmFsdWVzID0gdXNlTG9nP2QuZGF0YS5tYXAoKGRkKT0+e3JldHVybiBNYXRoLmxvZzEwKCtkZCsxKX0pOmQuZGF0YTtcbiAgICAgICAgZC5ncm91cCA9IGQudGlzc3VlSWQ7XG4gICAgICAgIGQubGFiZWwgPSBkLmdlbmVTeW1ib2w7XG4gICAgICAgIGQuY29sb3IgPSBjb2xvcnM9PT11bmRlZmluZWQ/XCIjOTBjMWMxXCI6Y29sb3JzW2QuZ2VuY29kZUlkXTtcbiAgICB9KTtcbiAgICByZXR1cm4gZGF0YVthdHRyXTtcbn1cbiIsIi8qKlxuICogQ3JlYXRlcyBhbiBTVkdcbiAqIEBwYXJhbSBpZCB7U3RyaW5nfSBhIERPTSBlbGVtZW50IElEIHRoYXQgc3RhcnRzIHdpdGggYSBcIiNcIlxuICogQHBhcmFtIHdpZHRoIHtOdW1lcmljfVxuICogQHBhcmFtIGhlaWdodCB7TnVtZXJpY31cbiAqIEBwYXJhbSBtYXJnaW4ge09iamVjdH0gd2l0aCB0d28gYXR0cmlidXRlczogd2lkdGggYW5kIGhlaWdodFxuICogQHJldHVybiB7U2VsZWN0aW9ufSB0aGUgZDMgc2VsZWN0aW9uIG9iamVjdCBvZiB0aGUgU1ZHXG4gKi9cblxuaW1wb3J0IHtzZWxlY3R9IGZyb20gXCJkMy1zZWxlY3Rpb25cIjtcblxuLyoqXG4gKlxuICogQHBhcmFtIGlkIHtTdHJpbmd9IHRoZSBwYXJlbnQgZG9tIElEXG4gKiBAcGFyYW0gd2lkdGgge051bWVyaWN9XG4gKiBAcGFyYW0gaGVpZ2h0IHtOdW1lcmljfVxuICogQHBhcmFtIG1hcmdpbiB7T2JqZWN0fSB3aXRoIGF0dHI6IGxlZnQsIHRvcFxuICogQHBhcmFtIHN2Z0lkIHtTdHJpbmd9XG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVN2ZyhpZCwgd2lkdGgsIGhlaWdodCwgbWFyZ2luLCBzdmdJZD11bmRlZmluZWQpe1xuICAgIGlmIChzdmdJZD09PXVuZGVmaW5lZCkgc3ZnSWQ9YCR7aWR9LXN2Z2A7XG4gICAgcmV0dXJuIHNlbGVjdChcIiNcIitpZCkuYXBwZW5kKFwic3ZnXCIpXG4gICAgICAgIC5hdHRyKFwid2lkdGhcIiwgd2lkdGgpXG4gICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodClcbiAgICAgICAgLmF0dHIoXCJpZFwiLCBzdmdJZClcbiAgICAgICAgLmFwcGVuZChcImdcIilcbiAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgYHRyYW5zbGF0ZSgke21hcmdpbi5sZWZ0fSwgJHttYXJnaW4udG9wfSlgKVxufVxuXG4vKipcbiAqXG4gKiBAcGFyYW0gc3ZnT2JqXG4gKiBAcGFyYW0gZG93bmxvYWRGaWxlTmFtZSB7U3RyaW5nfVxuICogQHBhcmFtIHRlbXBEb3dubG9hZERpdklkIHtTdHJpbmd9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkb3dubG9hZFN2ZyhzdmdPYmosIGRvd25sb2FkRmlsZU5hbWUsIHRlbXBEb3dubG9hZERpdklkKXtcbiAgICBjb25zb2xlLmxvZyhzdmdPYmopO1xuICAgIHZhciAkc3ZnQ29weSA9IHN2Z09iai5jbG9uZSgpXG4gICAgLmF0dHIoXCJ2ZXJzaW9uXCIsIFwiMS4xXCIpXG4gICAgLmF0dHIoXCJ4bWxuc1wiLCBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIpO1xuXG4gICAgLy8gcGFyc2UgYW5kIGFkZCB0aGUgQ1NTIHN0eWxpbmcgdXNlZCBieSB0aGUgU1ZHXG4gICAgdmFyIHN0eWxlcyA9IHBhcnNlQ3NzU3R5bGVzKHN2Z09iai5nZXQoKSk7XG4gICAgJHN2Z0NvcHkucHJlcGVuZChzdHlsZXMpO1xuXG4gICAgJChcIiNcIiArIHRlbXBEb3dubG9hZERpdklkKS5odG1sKCcnKS5oaWRlKCk7XG4gICAgdmFyIHN2Z0h0bWwgPSAkKFwiI1wiICsgdGVtcERvd25sb2FkRGl2SWQpLmFwcGVuZCgkc3ZnQ29weSkuaHRtbCgpO1xuXG4gICAgdmFyIHN2Z0Jsb2IgPSBuZXcgQmxvYihbc3ZnSHRtbF0sIHt0eXBlOiBcImltYWdlL3N2Zyt4bWxcIn0pO1xuICAgIHNhdmVBcyhzdmdCbG9iLCBkb3dubG9hZEZpbGVOYW1lKTtcblxuICAgIC8vIGNsZWFyIHRoZSB0ZW1wIGRvd25sb2FkIGRpdlxuICAgICQoXCIjXCIgKyB0ZW1wRG93bmxvYWREaXZJZCkuaHRtbCgnJykuaGlkZSgpO1xufVxuLyoqXG4gKiBBIGZ1bmN0aW9uIGZvciBwYXJzaW5nIHRoZSBDU1Mgc3R5bGUgc2hlZXQgYW5kIGluY2x1ZGluZyB0aGUgc3R5bGUgcHJvcGVydGllcyBpbiB0aGUgZG93bmxvYWRhYmxlIFNWRy5cbiAqIEBwYXJhbSBkb21cbiAqIEByZXR1cm5zIHtFbGVtZW50fVxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VDc3NTdHlsZXMgKGRvbSkge1xuICAgIHZhciB1c2VkID0gXCJcIjtcbiAgICB2YXIgc2hlZXRzID0gZG9jdW1lbnQuc3R5bGVTaGVldHM7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNoZWV0cy5sZW5ndGg7IGkrKykgeyAvLyBUT0RPOiB3YWxrIHRocm91Z2ggdGhpcyBibG9jayBvZiBjb2RlXG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmIChzaGVldHNbaV0uY3NzUnVsZXMgPT0gbnVsbCkgY29udGludWU7XG4gICAgICAgICAgICB2YXIgcnVsZXMgPSBzaGVldHNbaV0uY3NzUnVsZXM7XG5cbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgcnVsZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgcnVsZSA9IHJ1bGVzW2pdO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YocnVsZS5zdHlsZSkgIT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZWxlbXM7XG4gICAgICAgICAgICAgICAgICAgIC8vU29tZSBzZWxlY3RvcnMgd29uJ3Qgd29yaywgYW5kIG1vc3Qgb2YgdGhlc2UgZG9uJ3QgbWF0dGVyLlxuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbXMgPSAkKGRvbSkuZmluZChydWxlLnNlbGVjdG9yVGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1zID0gW107XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXNlZCArPSBydWxlLnNlbGVjdG9yVGV4dCArIFwiIHsgXCIgKyBydWxlLnN0eWxlLmNzc1RleHQgKyBcIiB9XFxuXCI7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIC8vIEluIEZpcmVmb3gsIGlmIHN0eWxlc2hlZXQgb3JpZ2luYXRlcyBmcm9tIGEgZGlmZiBkb21haW4sXG4gICAgICAgICAgICAvLyB0cnlpbmcgdG8gYWNjZXNzIHRoZSBjc3NSdWxlcyB3aWxsIHRocm93IGEgU2VjdXJpdHlFcnJvci5cbiAgICAgICAgICAgIC8vIEhlbmNlLCB3ZSBtdXN0IHVzZSBhIHRyeS9jYXRjaCB0byBoYW5kbGUgdGhpcyBpbiBGaXJlZm94XG4gICAgICAgICAgICBpZiAoZS5uYW1lICE9PSAnU2VjdXJpdHlFcnJvcicpIHRocm93IGU7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcbiAgICBzLnNldEF0dHJpYnV0ZSgndHlwZScsICd0ZXh0L2NzcycpO1xuICAgIHMuaW5uZXJIVE1MID0gXCI8IVtDREFUQVtcXG5cIiArIHVzZWQgKyBcIlxcbl1dPlwiO1xuXG4gICAgcmV0dXJuIHM7XG59XG4iLCIvKipcbiAqIENyZWF0ZSBhIHRvb2xiYXJcbiAqIFRoaXMgY2xhc3MgdXNlcyBhIGxvdCBvZiBqUXVlcnkgZm9yIGRvbSBlbGVtZW50IG1hbmlwdWxhdGlvblxuICovXG5cbmltcG9ydCB7c2VsZWN0fSBmcm9tIFwiZDMtc2VsZWN0aW9uXCI7XG5pbXBvcnQge3BhcnNlQ3NzU3R5bGVzfSBmcm9tIFwiLi91dGlsc1wiO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUb29sYmFyIHtcbiAgICBjb25zdHJ1Y3Rvcihkb21JZCwgdG9vbHRpcD11bmRlZmluZWQsIHZlcnRpY2FsPWZhbHNlKXtcbiAgICAgICAgJChgIyR7ZG9tSWR9YCkuc2hvdygpOyAvLyBpZiBoaWRkZW5cblxuICAgICAgICAvLyBhZGQgYSBuZXcgYmFyZ3JvdXAgZGl2IHRvIGRvbUlEIHdpdGggYm9vdHN0cmFwIGJ1dHRvbiBjbGFzc2VzXG4gICAgICAgIGNvbnN0IGJ0bkNsYXNzZXMgPSB2ZXJ0aWNhbD8nYnRuLWdyb3VwLXZlcnRpY2FsIGJ0bi1ncm91cC1zbSc6ICdidG4tZ3JvdXAgYnRuLWdyb3VwLXNtJztcbiAgICAgICAgdGhpcy5iYXIgPSAkKCc8ZGl2Lz4nKS5hZGRDbGFzcyhidG5DbGFzc2VzKS5hcHBlbmRUbyhgIyR7ZG9tSWR9YCk7XG4gICAgICAgIHRoaXMuYnV0dG9ucyA9IHt9O1xuICAgICAgICB0aGlzLnRvb2x0aXAgPSB0b29sdGlwO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBhIGRvd25sb2FkIGJ1dHRvblxuICAgICAqIEBwYXJhbSBpZCB7U3RyaW5nfSB0aGUgYnV0dG9uIGRvbSBJRFxuICAgICAqIEBwYXJhbSBzdmdJZCB7U3RyaW5nfSB0aGUgU1ZHIGRvbSBJRCB0byBncmFiIGFuZCBkb3dubG9hZFxuICAgICAqIEBwYXJhbSBvdXRmaWxlTmFtZSB7U3RyaW5nfSB0aGUgZG93bmxvYWQgZmlsZSBuYW1lXG4gICAgICogQHBhcmFtIGNsb25lSWQge1N0cmluZ30gdGhlIGNsb25lZCBTVkcgZG9tIElEXG4gICAgICogQHBhcmFtIGljb24ge1N0cmluZ30gYSBmb250YXdlc29tZSdzIGljb24gY2xhc3MgbmFtZVxuICAgICAqL1xuICAgIGNyZWF0ZURvd25sb2FkQnV0dG9uKGlkLCBzdmdJZCwgb3V0ZmlsZU5hbWUsIGNsb25lSWQsIGljb249J2ZhLWRvd25sb2FkJyl7XG4gICAgICAgIGNvbnN0ICRidXR0b24gPSB0aGlzLmNyZWF0ZUJ1dHRvbihpZCwgaWNvbik7XG4gICAgICAgIHNlbGVjdChgIyR7aWR9YClcbiAgICAgICAgICAgIC5vbignY2xpY2snLCAoKT0+e1xuICAgICAgICAgICAgICAgIHRoaXMuZG93bmxvYWRTdmcoc3ZnSWQsIG91dGZpbGVOYW1lLCBjbG9uZUlkKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAub24oJ21vdXNlb3ZlcicsICgpPT57XG4gICAgICAgICAgICAgICAgdGhpcy50b29sdGlwLnNob3coXCJEb3dubG9hZFwiKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAub24oJ21vdXNlb3V0JywgKCk9PntcbiAgICAgICAgICAgICAgICB0aGlzLnRvb2x0aXAuaGlkZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgY3JlYXRlUmVzZXRCdXR0b24oaWQsIGNhbGxiYWNrLCBpY29uPSdmYS1leHBhbmQtYXJyb3dzLWFsdCcpe1xuICAgICAgICBjb25zdCAkYnV0dG9uID0gdGhpcy5jcmVhdGVCdXR0b24oaWQsIGljb24pO1xuICAgICAgICBzZWxlY3QoYCMke2lkfWApXG4gICAgICAgICAgICAub24oJ2NsaWNrJywgY2FsbGJhY2spXG4gICAgICAgICAgICAub24oJ21vdXNlb3ZlcicsICgpPT57XG4gICAgICAgICAgICAgICAgdGhpcy50b29sdGlwLnNob3coXCJSZXNldCB0aGUgc2NhbGVzXCIpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5vbignbW91c2VvdXQnLCAoKT0+e1xuICAgICAgICAgICAgICAgIHRoaXMudG9vbHRpcC5oaWRlKCk7XG4gICAgICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBjcmVhdGUgYSBidXR0b24gdG8gdGhlIHRvb2xiYXJcbiAgICAgKiBAcGFyYW0gaWQge1N0cmluZ30gdGhlIGJ1dHRvbidzIGlkXG4gICAgICogQHBhcmFtIGljb24ge1N0cmluZ30gYSBmb250YXdlc29tZSBpY29uIGNsYXNzXG4gICAgICogRGVwZW5kZW5jaWVzOiBCb290c3RyYXAsIGpRdWVyeSwgRm9udGF3ZXNvbWVcbiAgICAgKi9cbiAgICBjcmVhdGVCdXR0b24oaWQsIGljb249J2ZhLWRvd25sb2FkJyl7XG4gICAgICAgIGNvbnN0ICRidXR0b24gPSAkKCc8YS8+JykuYXR0cignaWQnLCBpZClcbiAgICAgICAgICAgIC5hZGRDbGFzcygnYnRuIGJ0bi1kZWZhdWx0JykuYXBwZW5kVG8odGhpcy5iYXIpO1xuICAgICAgICAkKCc8aS8+JykuYWRkQ2xhc3MoYGZhICR7aWNvbn1gKS5hcHBlbmRUbygkYnV0dG9uKTtcbiAgICAgICAgdGhpcy5idXR0b25zW2lkXSA9ICRidXR0b247XG4gICAgICAgIHJldHVybiAkYnV0dG9uO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGF0dGFjaCBhIHRvb2x0aXAgZG9tIHdpdGggdGhlIHRvb2xiYXJcbiAgICAgKiBAcGFyYW0gdG9vbHRpcCB7VG9vbHRpcH1cbiAgICAgKi9cbiAgICBhdHRhY2hUb29sdGlwKHRvb2x0aXApe1xuICAgICAgICB0aGlzLnRvb2x0aXAgPSB0b29sdGlwO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERvd25sb2FkIFNWRyBvYmpcbiAgICAgKiBAcGFyYW0gc3ZnSWQge1N0cmluZ30gdGhlIFNWRyBkb20gSURcbiAgICAgKiBAcGFyYW0gZmlsZU5hbWUge1N0cmluZ30gdGhlIG91dHB1dCBmaWxlIG5hbWVcbiAgICAgKiBAcGFyYW0gY2xvbmVJZCB7U3RyaW5nfSB0aGUgdGVtcG9yYXJ5IGRvbSBJRCB0byBjb3B5IHRoZSBTVkcgdG9cbiAgICAgKi9cbiAgICBkb3dubG9hZFN2ZyhzdmdJZCwgZmlsZU5hbWUsIGNsb25lSWQpe1xuICAgICAgICAvLyBsZXQgc3ZnT2JqID0gJCgkKCQoYCR7XCIjXCIgK3N2Z0lkfSBzdmdgKSlbMF0pOyAvLyBjb21wbGljYXRlZCBqUXVlcnkgdG8gZ2V0IHRvIHRoZSBTVkcgb2JqZWN0XG4gICAgICAgIGxldCBzdmdPYmogPSAkKCQoJChgJHtcIiNcIiArc3ZnSWR9YCkpWzBdKTtcbiAgICAgICAgdmFyICRzdmdDb3B5ID0gc3ZnT2JqLmNsb25lKClcbiAgICAgICAgLmF0dHIoXCJ2ZXJzaW9uXCIsIFwiMS4xXCIpXG4gICAgICAgIC5hdHRyKFwieG1sbnNcIiwgXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiKTtcblxuICAgICAgICAvLyBwYXJzZSBhbmQgYWRkIGFsbCB0aGUgQ1NTIHN0eWxpbmcgdXNlZCBieSB0aGUgU1ZHXG4gICAgICAgIHZhciBzdHlsZXMgPSBwYXJzZUNzc1N0eWxlcyhzdmdPYmouZ2V0KCkpO1xuICAgICAgICAkc3ZnQ29weS5wcmVwZW5kKHN0eWxlcyk7XG5cbiAgICAgICAgJChcIiNcIiArIGNsb25lSWQpLmh0bWwoJycpLmhpZGUoKTsgLy8gbWFrZSBzdXJlIHRoZSBjb3B5SUQgaXMgaW52aXNpYmxlXG4gICAgICAgIHZhciBzdmdIdG1sID0gJChgIyR7Y2xvbmVJZH1gKS5hcHBlbmQoJHN2Z0NvcHkpLmh0bWwoKTtcblxuICAgICAgICB2YXIgc3ZnQmxvYiA9IG5ldyBCbG9iKFtzdmdIdG1sXSwge3R5cGU6IFwiaW1hZ2Uvc3ZnK3htbFwifSk7XG4gICAgICAgIHNhdmVBcyhzdmdCbG9iLCBmaWxlTmFtZSk7XG5cbiAgICAgICAgLy8gY2xlYXIgdGhlIHRlbXAgZG93bmxvYWQgZGl2XG4gICAgICAgICQoYCMke2Nsb25lSWR9YCkuaHRtbCgnJykuaGlkZSgpO1xuICAgIH1cbn0iLCIndXNlIHN0cmljdCc7XG5pbXBvcnQge2pzb24sIHRzdn0gZnJvbSAnZDMtZmV0Y2gnO1xuaW1wb3J0IHtzZWxlY3QsIHNlbGVjdEFsbH0gZnJvbSAnZDMtc2VsZWN0aW9uJztcbmltcG9ydCB7Z2V0R3RleFVybHMsXG4gICAgcGFyc2VUaXNzdWVzXG59IGZyb20gJy4vbW9kdWxlcy9ndGV4RGF0YVBhcnNlcic7XG5pbXBvcnQgVG9vbGJhciBmcm9tICcuL21vZHVsZXMvVG9vbGJhcic7XG5cbi8qXG5UT0RPOlxuZmlyc3QgYnVpbGQgYSBkYXRhIG1hdHJpeCB3aXRoIHRoZSBmb2xsb3dpbmcgc3RydWN0dXJlXG57XG4gICAgY29sOiB0aXNzdWVzXG4gICAgcm93OiBkYXRhIHR5cGVzXG4gICAgZGF0YTogWyBvYmplY3RzIHdpdGggY29sIGFuZCByb3cgYW5kIHZhbHVlIF1cbn1cbiAqL1xuLyoqXG4gKiBidWlsZCB0aGUgZGF0YSBtYXRyaXggdGFibGVcbiAqIEBwYXJhbSB0YWJsZUlkIHtTdHJpbmd9XG4gKiBAcGFyYW0gZGF0YXNldElkIHtTdHJpbmd9XG4gKiBAcGFyYW0gdXJsc1xuICovXG5cbmV4cG9ydCBmdW5jdGlvbiBsYXVuY2godGFibGVJZCwgZGF0YXNldElkPSdndGV4X3Y3JywgdXJscz1nZXRHdGV4VXJscygpKXtcbiAgICBjb25zdCBwcm9taXNlcyA9IFtcbiAgICAgICAgLy8gVE9ETzogdXJscyBmb3Igb3RoZXIgZGF0YXNldHNcbiAgICAgICAganNvbih1cmxzLnRpc3N1ZSksXG4gICAgICAgIHRzdih1cmxzLnJuYXNlcUNyYW0pLFxuICAgICAgICB0c3YodXJscy53Z3NDcmFtKSxcbiAgICAgICAgdHN2KHVybHMuc2FtcGxlKSxcbiAgICBdO1xuXG4gICAgUHJvbWlzZS5hbGwocHJvbWlzZXMpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKGFyZ3Mpe1xuICAgICAgICAgICAgbGV0IHRpc3N1ZXMgPSBwYXJzZVRpc3N1ZXMoYXJnc1swXSk7XG4gICAgICAgICAgICBjb25zdCBjcmFtID0ge1xuICAgICAgICAgICAgICAgIHJuYXNlcTogYXJnc1sxXS5yZWR1Y2UoKGEsIGQpPT57YVtkLnNhbXBsZV9pZF09ZDsgcmV0dXJuIGE7fSwge30pLFxuICAgICAgICAgICAgICAgIHdnczogYXJnc1syXS5yZWR1Y2UoKGEsIGQpPT57YVtkLnNhbXBsZV9pZF09ZDsgcmV0dXJuIGE7fSwge30pXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgbGV0IHNhbXBsZXMgPSBhcmdzWzNdXG4gICAgICAgICAgICAgICAgLmZpbHRlcigocyk9PnMuZGF0YXNldElkPT1kYXRhc2V0SWQpXG4gICAgICAgICAgICAgICAgLm1hcCgocyk9PntcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChzLmRhdGFUeXBlKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJXR1NcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMuY3JhbUZpbGUgPSBjcmFtLndnc1tzLnNhbXBsZUlkXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJSTkFTRVFcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMuY3JhbUZpbGUgPSBjcmFtLnJuYXNlcVtzLnNhbXBsZUlkXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZG8gbm90aGluZ1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHM7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjb25zdCB0aGVNYXRyaXggPSBfYnVpbGRNYXRyaXgoZGF0YXNldElkLCBzYW1wbGVzLCB0aXNzdWVzKTtcblxuICAgICAgICAgICAgX3JlbmRlck1hdHJpeFRhYmxlKHRhYmxlSWQsIHRoZU1hdHJpeCk7XG4gICAgICAgICAgICBfYWRkRmlsdGVycyh0YWJsZUlkLCB0aGVNYXRyaXgsIHNhbXBsZXMsIHRpc3N1ZXMpO1xuXG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaChmdW5jdGlvbihlcnIpe2NvbnNvbGUuZXJyb3IoZXJyKX0pO1xufVxuXG5mdW5jdGlvbiBfYWRkRmlsdGVycyh0YWJsZUlkLCBtYXQsIHNhbXBsZXMsIHRpc3N1ZXMpe1xuICAgIGNvbnN0IF9fZmlsdGVyID0gKCk9PntcbiAgICAgICAgY29uc3Qgc2V4ID0gc2VsZWN0KCdpbnB1dFtuYW1lPVwic2V4XCJdOmNoZWNrZWQnKS5ub2RlKCkudmFsdWU7XG4gICAgICAgIGNvbnN0IGFnZSA9IHNlbGVjdCgnaW5wdXRbbmFtZT1cImFnZVwiXTpjaGVja2VkJykubm9kZSgpLnZhbHVlO1xuICAgICAgICBpZiAoc2V4ID09ICdib3RoJyAmJiBhZ2UgPT0gJ2FsbCcpe1xuICAgICAgICAgICAgX3JlbmRlck1hdHJpeFRhYmxlKHRhYmxlSWQsIF9idWlsZE1hdHJpeChtYXQuZGF0YXNldElkLCBzYW1wbGVzLCB0aXNzdWVzKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgZmlsdGVyZWRNYXQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICBpZiAoc2V4ID09ICdib3RoJykgZmlsdGVyZWRNYXQgPSBfYnVpbGRNYXRyaXgobWF0LmRhdGFzZXRJZCwgc2FtcGxlcy5maWx0ZXIocz0+cy5hZ2VCcmFja2V0PT1hZ2UpLCB0aXNzdWVzKTtcbiAgICAgICAgICAgIGVsc2UgaWYgKGFnZSA9PSAnYWxsJykgZmlsdGVyZWRNYXQgPSBfYnVpbGRNYXRyaXgobWF0LmRhdGFzZXRJZCwgc2FtcGxlcy5maWx0ZXIocz0+cy5zZXg9PXNleCksIHRpc3N1ZXMpO1xuICAgICAgICAgICAgZWxzZSBmaWx0ZXJlZE1hdCA9IF9idWlsZE1hdHJpeChtYXQuZGF0YXNldElkLCBzYW1wbGVzLmZpbHRlcihzPT5zLnNleD09c2V4ICYmIHMuYWdlQnJhY2tldD09YWdlKSwgdGlzc3Vlcyk7XG4gICAgICAgICAgICBfcmVuZGVyTWF0cml4VGFibGUodGFibGVJZCwgZmlsdGVyZWRNYXQpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBzZWxlY3QoJyNmaWx0ZXItbWVudScpLnNlbGVjdEFsbCgnaW5wdXRbbmFtZT1cInNleFwiXScpLm9uKCdjaGFuZ2UnLCBfX2ZpbHRlcik7XG4gICAgc2VsZWN0KCcjZmlsdGVyLW1lbnUnKS5zZWxlY3RBbGwoJ2lucHV0W25hbWU9XCJhZ2VcIl0nKS5vbignY2hhbmdlJywgX19maWx0ZXIpO1xufVxuXG5mdW5jdGlvbiBfYnVpbGRNYXRyaXgoZGF0YXNldElkLCBzYW1wbGVzLCB0aXNzdWVzKXtcbiAgICBjb25zdCBfX2J1aWxkSGFzaCA9IGZ1bmN0aW9uKGRhdGFUeXBlKXtcbiAgICAgICAgcmV0dXJuIHNhbXBsZXMuZmlsdGVyKChzKT0+cy5kYXRhVHlwZT09ZGF0YVR5cGUpLnJlZHVjZSgoYSwgZCk9PntcbiAgICAgICAgICAgIGlmKGFbZC50aXNzdWVJZF09PT11bmRlZmluZWQpIGFbZC50aXNzdWVJZF0gPSAwO1xuICAgICAgICAgICAgYVtkLnRpc3N1ZUlkXT0gYVtkLnRpc3N1ZUlkXSsxO1xuICAgICAgICAgICAgcmV0dXJuIGE7XG4gICAgICAgIH0sIHt9KTtcbiAgICB9O1xuICAgIGNvbnN0IGNvbHVtbnMgPSBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIGxhYmVsOiAnUk5BLVNlcScsXG4gICAgICAgICAgICBpZDogJ1JOQVNFUScsXG4gICAgICAgICAgICBkYXRhOiBfX2J1aWxkSGFzaCgnUk5BU0VRJylcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgbGFiZWw6ICdXRVMnLFxuICAgICAgICAgICAgaWQ6ICdXRVMnLFxuICAgICAgICAgICAgZGF0YTogX19idWlsZEhhc2goJ1dFUycpXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIGxhYmVsOiAnV0dTJyxcbiAgICAgICAgICAgIGlkOiAnV0dTJyxcbiAgICAgICAgICAgIGRhdGE6IF9fYnVpbGRIYXNoKCdXR1MnKVxuICAgICAgICB9XG4gICAgXTtcbiAgICBjb25zdCByb3dzID0gdGlzc3Vlcy5tYXAoKHQpPT57XG4gICAgICAgIHQuaWQgPSB0LnRpc3N1ZUlkO1xuICAgICAgICB0LmxhYmVsID0gdC50aXNzdWVOYW1lO1xuICAgICAgICBjb2x1bW5zLmZvckVhY2goKGNvbCk9PntcbiAgICAgICAgICAgIHRbY29sLmlkXSA9IGNvbC5kYXRhW3QuaWRdIHx8IHVuZGVmaW5lZDtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0O1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZGF0YXNldElkOiBkYXRhc2V0SWQsXG4gICAgICAgIFg6IHJvd3MsXG4gICAgICAgIFk6IGNvbHVtbnMsXG4gICAgICAgIGRhdGE6IHNhbXBsZXNcbiAgICB9O1xufVxuXG5cbi8qKlxuICogUmVuZGVyIHRoZSBtYXRyaXggaW4gYW4gSFRNTCB0YWJsZSBmb3JtYXRcbiAqIEBwYXJhbSB0YWJsZUlkIHtTdHJpbmd9IHRoZSBET00gSUQgb2YgdGhlIHRhYmxlXG4gKiBAcGFyYW0gbWF0IHtPYmplY3R9IG9mIGF0dHI6IGRhdGFzZXRJZCwgWC0tYSBsaXN0IG9mIHggb2JqZWN0cywgWS0tYSBsaXN0IG9mIHkgb2JqZWN0c1xuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gX3JlbmRlck1hdHJpeFRhYmxlKHRhYmxlSWQsIG1hdCl7XG4gICAgY29uc3QgZGF0YXNldCA9IHtcbiAgICAgICAgJ2d0ZXhfdjcnOiB7XG4gICAgICAgICAgICBsYWJlbDonR1RFWCBWNycsXG4gICAgICAgICAgICBiZ2NvbG9yOiAnIzJhNzE4YidcbiAgICAgICAgfVxuICAgIH07XG4gICAgLy8gcmVuZGVyaW5nIHRoZSBjb2x1bW4gbGFiZWxzXG4gICAgY29uc3QgdGhlVGFibGUgPSBzZWxlY3QoYCMke3RhYmxlSWR9YCk7XG4gICAgdGhlVGFibGUuc2VsZWN0KCd0aGVhZCcpLnNlbGVjdEFsbCgndGgnKVxuICAgICAgICAuZGF0YShbe2xhYmVsOlwiXCIsIGlkOlwiXCJ9XS5jb25jYXQobWF0LlkpKVxuICAgICAgICAuZW50ZXIoKVxuICAgICAgICAuYXBwZW5kKCd0aCcpXG4gICAgICAgIC5hdHRyKCdzY29wZScsICdjb2wnKVxuICAgICAgICAuYXR0cignY2xhc3MnLCAoZCwgaSk9PmQuaWQ9PVwiXCI/Jyc6YHkke2ktMX1gKVxuICAgICAgICAudGV4dCgoZCk9PmQubGFiZWwpO1xuXG4gICAgdGhlVGFibGUuc2VsZWN0KCcudGFibGUtbGFiZWwnKS5zZWxlY3RBbGwoJyonKS5yZW1vdmUoKTtcbiAgICB0aGVUYWJsZS5zZWxlY3QoJy50YWJsZS1sYWJlbCcpLmFwcGVuZCgndGgnKVxuICAgICAgICAuYXR0cignY29sc3BhbicsIG1hdC5ZLmxlbmd0aCArIDEpXG4gICAgICAgIC50ZXh0KGRhdGFzZXRbbWF0LmRhdGFzZXRJZF0ubGFiZWwpXG4gICAgICAgIC5zdHlsZSgnYmFja2dyb3VuZC1jb2xvcicsZGF0YXNldFttYXQuZGF0YXNldElkXS5iZ2NvbG9yKTtcblxuICAgIF9yZW5kZXJDb3VudHModGhlVGFibGUuc2VsZWN0KCd0Ym9keScpLCBtYXQpO1xuICAgIF9hZGRDbGlja0V2ZW50cyh0YWJsZUlkKTtcbiAgICBfYWRkVG9vbGJhcih0YWJsZUlkLCBtYXQpO1xufVxuXG5mdW5jdGlvbiBfcmVuZGVyQ291bnRzKHRib2R5LCBtYXQpe1xuICAgIHRib2R5LnNlbGVjdEFsbCgnLmRhdGEtcm93JykucmVtb3ZlKCk7XG4gICAgY29uc3QgdGhlUm93cyA9IHRib2R5LnNlbGVjdEFsbCgnLmRhdGEtcm93JylcbiAgICAgICAgLmRhdGEobWF0LlgpXG4gICAgICAgIC5lbnRlcigpXG4gICAgICAgIC5hcHBlbmQoJ3RyJylcbiAgICAgICAgLmNsYXNzZWQoJ2RhdGEtcm93JywgdHJ1ZSk7XG5cbiAgICAvLyByZW5kZXJpbmcgdGhlIHJvdyBsYWJlbFxuICAgIHRoZVJvd3MuYXBwZW5kKCd0aCcpXG4gICAgICAgIC5hdHRyKCdzY29wZScsICdyb3cnKVxuICAgICAgICAuYXR0cignY2xhc3MnLCAoZCwgaSk9PmB4JHtpfWApXG4gICAgICAgIC50ZXh0KChkKT0+ZC5sYWJlbCk7XG5cbiAgICBtYXQuWS5mb3JFYWNoKCh5LCBqKT0+e1xuICAgICAgICB0aGVSb3dzLmFwcGVuZCgndGQnKVxuICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgKGQsIGkpPT5geCR7aX0geSR7an1gKVxuICAgICAgICAgICAgLnRleHQoKGQpPT5kW3kuaWRdfHwnJyk7XG4gICAgfSk7XG5cbn1cblxuLyoqXG4gKiBBZGQgY3VzdG9taXplZCBjb2x1bW4sIHJvdyBhbmQgY2VsbCBjbGljayBldmVudHNcbiAqIEBwYXJhbSB0YWJsZUlkIHtTdHJpbmd9IHRoZSBkb20gSUQgb2YgdGhlIHRhYmxlXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBfYWRkQ2xpY2tFdmVudHModGFibGVJZCl7XG4gICAgY29uc3QgdGhlQ2VsbHMgPSBzZWxlY3QoYCMke3RhYmxlSWR9YCkuc2VsZWN0KCd0Ym9keScpLnNlbGVjdEFsbCgndGQnKTtcblxuICAgIC8vIGNvbHVtbiBsYWJlbHNcbiAgICBzZWxlY3QoYCMke3RhYmxlSWR9YCkuc2VsZWN0KCd0aGVhZCcpLnNlbGVjdEFsbCgndGgnKVxuICAgICAgICAuc3R5bGUoJ2N1cnNvcicsICdwb2ludGVyJylcbiAgICAgICAgLm9uKCdjbGljaycsIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAvLyB0b2dnbGUgdGhlIHNlbGVjdGlvblxuICAgICAgICAgICBjb25zdCB0aGVDb2x1bW4gPSBzZWxlY3QodGhpcykuYXR0cignY2xhc3MnKTtcbiAgICAgICAgICAgaWYgKHNlbGVjdCh0aGlzKS5hdHRyKCdzY29wZScpID09ICdjb2wnKSB7XG4gICAgICAgICAgICAgICBzZWxlY3QodGhpcykuYXR0cignc2NvcGUnLCAnc2VsZWN0ZWQnKTtcbiAgICAgICAgICAgICAgIHRoZUNlbGxzLmZpbHRlcihgLiR7dGhlQ29sdW1ufWApLmNsYXNzZWQoJ3NlbGVjdGVkJywgdHJ1ZSk7XG4gICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICBzZWxlY3QodGhpcykuYXR0cignc2NvcGUnLCAnY29sJyk7XG4gICAgICAgICAgICAgICB0aGVDZWxscy5maWx0ZXIoYC4ke3RoZUNvbHVtbn1gKS5jbGFzc2VkKCdzZWxlY3RlZCcsIGZhbHNlKTtcbiAgICAgICAgICAgfVxuICAgICAgICAgICAvLyBjb25zb2xlLmxvZyh0aGVDb2x1bW4pO1xuICAgICAgICB9KTtcblxuICAgIC8vIHJvdyBsYWJlbHNcbiAgICBzZWxlY3QoYCMke3RhYmxlSWR9YCkuc2VsZWN0KCd0Ym9keScpLnNlbGVjdEFsbCgndGgnKVxuICAgICAgICAuc3R5bGUoJ2N1cnNvcicsICdwb2ludGVyJylcbiAgICAgICAgLm9uKCdjbGljaycsIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgIGNvbnN0IHRoZVJvdyA9IHNlbGVjdCh0aGlzKS5hdHRyKCdjbGFzcycpO1xuICAgICAgICAgICBpZiAoc2VsZWN0KHRoaXMpLmF0dHIoJ3Njb3BlJykgPT0gJ3JvdycpIHtcbiAgICAgICAgICAgICAgIHNlbGVjdCh0aGlzKS5hdHRyKCdzY29wZScsICdzZWxlY3RlZCcpO1xuICAgICAgICAgICAgICAgdGhlQ2VsbHMuZmlsdGVyKGAuJHt0aGVSb3d9YCkuY2xhc3NlZCgnc2VsZWN0ZWQnLCB0cnVlKTtcbiAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgIHNlbGVjdCh0aGlzKS5hdHRyKCdzY29wZScsICdyb3cnKTtcbiAgICAgICAgICAgICAgIHRoZUNlbGxzLmZpbHRlcihgLiR7dGhlUm93fWApLmNsYXNzZWQoJ3NlbGVjdGVkJywgZmFsc2UpO1xuICAgICAgICAgICB9XG4gICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHRoZVJvdyk7XG4gICAgICAgIH0pO1xuXG5cbiAgICAvLyBkYXRhIGNlbGxzXG4gICAgdGhlQ2VsbHMuc3R5bGUoJ2N1cnNvcicsICdwb2ludGVyJylcbiAgICAgICAgLm9uKCdjbGljaycsIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAvLyB0b2dnbGUgdGhlIHNlbGVjdGVkIGNsYXNzIGFzc2lnbm1lbnRcbiAgICAgICAgICAgIHNlbGVjdCh0aGlzKS5jbGFzc2VkKCdzZWxlY3RlZCcsICFzZWxlY3QodGhpcykuY2xhc3NlZCgnc2VsZWN0ZWQnKSk7XG4gICAgICAgIH0pXG59XG5cbmZ1bmN0aW9uIF9hZGRUb29sYmFyKHRhYmxlSWQsIG1hdCl7XG4gICAgLy8gVE9ETzogZ2V0IHJpZCBvZiBoYXJkLWNvZGVkIGRvbSBJRHNcbiAgICBjb25zdCB0aGVDZWxscyA9IHNlbGVjdChgIyR7dGFibGVJZH1gKS5zZWxlY3QoJ3Rib2R5Jykuc2VsZWN0QWxsKCd0ZCcpO1xuICAgIHNlbGVjdCgnI21hdHJpeC10YWJsZS10b29sYmFyJykuc2VsZWN0QWxsKCcqJykucmVtb3ZlKCk7XG4gICAgY29uc3QgdG9vbGJhciA9IG5ldyBUb29sYmFyKCdtYXRyaXgtdGFibGUtdG9vbGJhcicsIHVuZGVmaW5lZCwgdHJ1ZSk7XG4gICAgdG9vbGJhci5jcmVhdGVCdXR0b24oJ3NhbXBsZS1kb3dubG9hZCcpO1xuICAgIHRvb2xiYXIuY3JlYXRlQnV0dG9uKCdzZW5kLXRvLWZpcmVjbG91ZCcsICdmYS1jbG91ZC11cGxvYWQtYWx0Jyk7XG5cbiAgICBzZWxlY3QoJyNzYW1wbGUtZG93bmxvYWQnKVxuICAgICAgICAuc3R5bGUoJ2N1cnNvcicsICdwb2ludGVyJylcbiAgICAgICAgLm9uKCdjbGljaycsIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBsZXQgY2VsbHMgPSB0aGVDZWxscy5maWx0ZXIoYC5zZWxlY3RlZGApO1xuICAgICAgICAgICAgaWYgKGNlbGxzLmVtcHR5KCkpIGFsZXJ0KCdZb3UgaGF2ZSBub3Qgc2VsZWN0ZWQgYW55IHNhbXBsZXMgdG8gZG93bmxvYWQuJyk7XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBjZWxscy5lYWNoKGZ1bmN0aW9uKGQpe1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtYXJrZXIgPSBzZWxlY3QodGhpcykuYXR0cignY2xhc3MnKS5zcGxpdCgnICcpLmZpbHRlcigoYyk9PntyZXR1cm4gYyE9J3NlbGVjdGVkJ30pO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB4ID0gbWF0LlhbcGFyc2VJbnQobWFya2VyWzBdLnJlcGxhY2UoJ3gnLCAnJykpXS5pZDtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeSA9IG1hdC5ZW3BhcnNlSW50KG1hcmtlclsxXS5yZXBsYWNlKCd5JywgJycpKV0uaWQ7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdEb3dubG9hZCAnICsgeCArICcgOiAnKyB5KTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0ZWRTYW1wbGVzID0gbWF0LmRhdGEuZmlsdGVyKChzKT0+cy5kYXRhVHlwZT09eSYmcy50aXNzdWVJZD09eCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHNlbGVjdGVkU2FtcGxlcyk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9KTtcblxuICAgIHNlbGVjdCgnI3NlbmQtdG8tZmlyZWNsb3VkJylcbiAgICAgICAgLnN0eWxlKCdjdXJzb3InLCAncG9pbnRlcicpXG4gICAgICAgIC5vbignY2xpY2snLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgYWxlcnQoJ1NlbmQgdG8gRmlyZUNsb3VkLiBUbyBiZSBpbXBsZW1lbnRlZC4nKVxuICAgICAgICB9KTtcbn1cblxuXG4iXSwi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TyxDQUFDLENBQUM7V0FDN0MsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEtBQUssRUFBRTtlQUNyQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQztlQUN2QyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzlELE1BQU07ZUFDSCxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztlQUNsQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQy9EOztTQUVILENBQUMsQ0FBQzs7O0lBR1AsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQztTQUNoRCxLQUFLLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQztTQUMxQixFQUFFLENBQUMsT0FBTyxFQUFFLFVBQVU7V0FDcEIsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztXQUMxQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksS0FBSyxFQUFFO2VBQ3JDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFDO2VBQ3ZDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FB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