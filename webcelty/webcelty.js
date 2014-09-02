var webcelty = function webcelty(url, token) {
    this.sock = new SockJS(url);
    this.token = token;
    this.url = url;

    $(".state #addr").html(url);

    this._register_handlers();

    var that = this;
    webhelmet.submit = function (data) {
        that.command(data.command, data.args);
    };
}

webcelty.prototype = {
    ready: function () {},

    _register_handlers: function () {
        var that = this;
        this.sock.onopen = function() {
            that.auth_request(that.token);
        };

        this.sock.onmessage = function(e) {
            that.dispatch($.parseJSON(e.data));
        };

        this.sock.onclose = function() {
            that.show_state("not connected", "red");
            setTimeout(function () {
                that.sock = new SockJS(that.url);
                that._register_handlers();
            }, 1000);
        };
    },

    _send: function (data) {
        var json = JSON.stringify(data);

        this.sock.send(json+"\r\n");
    },

    _halt: function (e) {
        console.log("webcelty halt: " + e);
        this.sock.onclose = undefined;
        this.sock.onmessage = undefined;
        this.sock.onopen = undefined;
        this.sock.close();
        this.sock = undefined;
    },

    _jsonlist: function (_list) {
        list = [];

        for (var k in _list) {
            if (_list[k] != undefined)
                list.push(_list[k]);
        }
        return list;
    },

    show_state: function (message, color) {
        $("#connection").html(message);
        $("#connection").css("color", color);
        $("#connection").css("border-color", color);
    },

    auth_request: function (token) {
        this.show_state("authenticating...", "yellow");
        this._send({token: token});
    },

    subscribe: function () {
        $("#subscriptions").append("<li id=\""+arguments[0]+"\">" + arguments[0] + "</li>");

        this._send({
            command: "celty:subscribe",
            args: this._jsonlist(arguments),
        });
    },

    unsubscribe: function () {
        $("#subscriptions #" + arguments[0]).remove();

        this._send({
            command: "celty:unsubscribe",
            args: [arguments[0]],
        });
    },

    command: function (cmd, args) {
        this._send({
            command: cmd,
            args: args,
        });
    },

    dispatch: function (r) {
        switch (r.type) {
            case "auth":
                if (r.result == "success") {
                    this.show_state("connected", "green");
                    this.ready();
                } else {
                    this.show_state("celty halted -> auth error: " + r.error, "red");
                    this._halt("auth error");
                }

                break;
            case "widgets":
                for (var key in r.data) {
                    text = r.data[key].join("\n");
                    if ($("#" + key).length) {
                        $("#" + key).html(text);
                    } else {
                        $("#widgets").append('<div class="block"><div class="key">'+key+':</div><pre id="' + key + '">'+text+'</pre></div>');
                    }
                }
                break;
            case "ui":
                webhelmet.renderJSON(r.data, $("#helmet_render"));
                break;
            case "error":
                alert(r.error);
                break;
        }
    }, 
}



$(document).ready(function () {
    c = new webcelty("http://127.0.0.1:23589", "1");
    c.ready = function () {
        this.subscribe("celty:widgets");
        this.command("celty:main");
    };


    $("#back_command").click(function () {
        $("#helmet_title").html("&nbsp;");
    });

    $(".celty_command").click(function () {
        args = $(this).attr("data-args");
        if (args != undefined)
            args = args.split(",");

        c._send({
            command: $(this).attr("data-command"),
            args: args,
        });
    });
});
