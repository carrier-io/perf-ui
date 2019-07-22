(function() {
    if ("undefined" != typeof window) {
        "use strict";
        var a = {
            getAbsoluteURL: function(e) {
                var t = window.document.createElement("a");
                return t.href = e, t.href
            },
            getHostname: function(e) {
                var t = window.document.createElement("a");
                return t.href = e, t.hostname
            },
            exists: function(t, e) {
                return e.some(function(e) {
                    return e === t
                })
            },
            caseInsensitiveAttributeValueFilter: function(t, n) {
                return function(e) {
                    if ((e.getAttribute(t) || "").toLowerCase() === n.toLowerCase()) return e
                }
            },
            isHTTP2: function() {
                var e = a.getConnectionType().toLowerCase();
                return "h2" === e || e.startsWith("spdy")
            },
            getConnectionType: function() {
                if (window.performance.getEntriesByType("navigation") && window.performance.getEntriesByType("navigation")[0] && window.performance.getEntriesByType("navigation")[0].nextHopProtocol) return window.performance.getEntriesByType("navigation")[0].nextHopProtocol;
                if (window.performance && window.performance.getEntriesByType && window.performance.getEntriesByType("resource")) {
                    var e = window.performance.getEntriesByType("resource");
                    if (1 < e.length && e[0].nextHopProtocol)
                        for (var t = document.domain, n = 0, r = e.length; n < r; n++)
                            if (t === a.getHostname(e[n].name)) return e[n].nextHopProtocol
                }
                return "unknown"
            },
            getSynchJSFiles: function(e) {
                return Array.prototype.slice.call(e.getElementsByTagName("script")).filter(function(e) {
                    return !e.async && e.src && !e.defer
                }).map(function(e) {
                    return a.getAbsoluteURL(e.src)
                })
            },
            getAsynchJSFiles: function(e) {
                return Array.prototype.slice.call(e.getElementsByTagName("script")).filter(function(e) {
                    return e.async && e.src
                }).map(function(e) {
                    return a.getAbsoluteURL(e.src)
                })
            },
            getResourceHintsHrefs: function(t) {
                return Array.prototype.slice.call(window.document.head.getElementsByTagName("link")).filter(function(e) {
                    return e.rel === t
                }).map(function(e) {
                    return e.href
                })
            },
            getCSSFiles: function(e) {
                return Array.prototype.slice.call(e.getElementsByTagName("link")).filter(function(e) {
                    return "stylesheet" === e.rel && !e.href.startsWith("data:")
                }).map(function(e) {
                    return a.getAbsoluteURL(e.href)
                })
            },
            plural: function(e) {
                return 1 !== e ? "s" : ""
            },
            getTransferSize: function(e) {
                var t = window.performance.getEntriesByName(e, "resource");
                return 1 === t.length && "number" == typeof t[0].transferSize ? t[0].transferSize : 0
            }
        };
        return function(i) {
            var e = {},
                t = {},
                n = {},
                r = {};
            try {
                n.altImages = function(e) {
                    "use strict";
                    var t = Array.prototype.slice.call(window.document.getElementsByTagName("img")),
                        n = 0,
                        r = [],
                        a = 0,
                        i = 0,
                        o = "",
                        s = {};
                    return t.forEach(function(e) {
                        e.alt && "" !== e.alt ? e.alt && 125 < e.alt.length && (n += 5, r.push(e.src), i++) : (n += 10, a++, e.src && (r.push(e.src), s[e.src] = 1))
                    }), 0 < a && (o = "The page has " + a + " image" + e.plural(a) + " that lack alt attribute(s) and " + Object.keys(s).length + " of them are unique."), 0 < i && (o += "The page has " + i + " image" + e.plural(i) + " where the alt text are too long (longer than 125 characters)."), {
                        id: "altImages",
                        title: "Always use an alt attribute on image tags",
                        description: "All img tags require an alt attribute. This goes without exception. Everything else is an error. If you have an img tag in your HTML without an alt attribute, add it now. https://www.marcozehe.de/2015/12/14/the-web-accessibility-basics/",
                        advice: o,
                        score: Math.max(0, 100 - n),
                        weight: 5,
                        offending: r,
                        tags: ["accessibility", "images"]
                    }
                }(i)
            } catch (e) {
                r.altImages = e.message
            }
            try {
                n.headings = function() {
                    "use strict";
                    var e = ["h6", "h5", "h4", "h3", "h2", "h1"],
                        n = 0,
                        t = 0,
                        r = "";
                    if (e.forEach(function(e) {
                            t += Array.prototype.slice.call(window.document.getElementsByTagName(e)).length
                        }), 0 === t) n = 100, r = "The page is missing headings. Use them to get a better structure of your content.";
                    else {
                        var a = !1,
                            i = [];
                        e.forEach(function(e) {
                            var t = Array.prototype.slice.call(window.document.getElementsByTagName(e));
                            a && 0 === t.length && (n += 10, i.push("The page is missing a " + e + " and has heading(s) with lower priority.")), 0 < t.length && (a = !0)
                        }), r = i.join(" ")
                    }
                    return {
                        id: "headings",
                        title: "Use heading tags to structure your page",
                        description: "Headings give your document a logical, easy to follow structure. Have you ever wondered how Wikipedia puts together its table of contents for each article? They use the logical heading structure for that, too! The H1 through H6 elements are unambiguous in telling screen readers, search engines and other technologies what the structure of your document is. https://www.marcozehe.de/2015/12/14/the-web-accessibility-basics/",
                        advice: r,
                        score: Math.max(0, 100 - n),
                        weight: 4,
                        offending: [],
                        tags: ["accessibility", "html"]
                    }
                }()
            } catch (e) {
                r.headings = e.message
            }
            try {
                n.labelOnInput = function() {
                    "use strict";
                    var t = Array.prototype.slice.call(window.document.getElementsByTagName("label")),
                        n = 0,
                        r = [],
                        e = Array.prototype.slice.call(window.document.querySelectorAll("input, textarea, select")),
                        a = ["button", "hidden", "image", "reset", "submit"];
                    return e.forEach(function(e) {
                        (function(e, t) {
                            return t.includes(e.type)
                        })(e, a) || function(e) {
                            return "LABEL" === e.parentElement.nodeName
                        }(e) || function(e, t) {
                            return e.id && 0 < function(t, e) {
                                return e.filter(function(e) {
                                    return e.attributes.for && e.attributes.for.value === t
                                })
                            }(e.id, t).length
                        }(e, t) || (r.push(e.id || e.name || e.outerHTML), n += 10)
                    }), {
                        id: "labelOnInput",
                        title: "Always set labels on inputs in forms",
                        description: "Most input elements, as well as the select and textarea elements, need an associated label element that states their purpose. The only exception is those that produce a button, like the reset and submit buttons do. Others, be it text, checkbox, password, radio (button), search etc. require a label element to be present. https://www.marcozehe.de/2015/12/14/the-web-accessibility-basics/",
                        advice: 0 < n ? "There are " + n / 10 + " input(s) that are missing labels on a form." : "",
                        score: Math.max(0, 100 - n),
                        weight: 3,
                        offending: r,
                        tags: ["accessibility", "form"]
                    }
                }()
            } catch (e) {
                r.labelOnInput = e.message
            }
            try {
                n.landmarks = function() {
                    "use strict";
                    var t = 0;
                    return ["article", "aside", "footer", "header", "nav", "main"].forEach(function(e) {
                        t += Array.prototype.slice.call(window.document.getElementsByTagName(e)).length
                    }), {
                        id: "landmarks",
                        title: "Structure your content by using landmarks",
                        description: "Landmarks can be article, aside, footer, header, nav or main tag. Adding such landmarks appropriately can help further provide sense to your document and help users more easily navigate it. https://www.marcozehe.de/2015/12/14/the-web-accessibility-basics/",
                        advice: 0 === t ? "The page doesn't use any landmarks." : "",
                        score: 0 < t ? 100 : 0,
                        weight: 5,
                        offending: [],
                        tags: ["accessibility", "html"]
                    }
                }()
            } catch (e) {
                r.landmarks = e.message
            }
            try {
                n.neverSuppressZoom = function(e) {
                    "use strict";
                    var t = Array.prototype.slice.call(document.querySelectorAll("meta[name][content]"));
                    t = t.filter(e.caseInsensitiveAttributeValueFilter("name", "viewport"));
                    var n = 100,
                        r = [];
                    return t.forEach(function(e) {
                        (-1 < e.content.indexOf("user-scalable=no") || -1 < e.content.indexOf("initial-scale=1.0; maximum-scale=1.0")) && (n = 0, r.push(e.content))
                    }), {
                        id: "neverSuppressZoom",
                        title: "Don't suppress pinch zoom",
                        description: "A key feature of mobile browsing is being able to zoom in to read content and out to locate content within a page. http://www.iheni.com/mobile-accessibility-tip-dont-suppress-pinch-zoom/",
                        advice: 0 === n ? "What! The page suppresses zooming, you really shouldn't do that." : "",
                        score: n,
                        weight: 8,
                        offending: r,
                        tags: ["accessibility"]
                    }
                }(i)
            } catch (e) {
                r.neverSuppressZoom = e.message
            }
            try {
                n.sections = function() {
                    "use strict";
                    var e = ["h6", "h5", "h4", "h3", "h2", "h1"],
                        r = 0,
                        t = "",
                        n = Array.prototype.slice.call(window.document.getElementsByTagName("section"));
                    return 0 === n.length ? (t = "The page doesn't use sections. You could use them to get a better structure of your content.", r = 100) : (n.forEach(function(t) {
                        var n = !1;
                        e.forEach(function(e) {
                            0 < Array.prototype.slice.call(t.getElementsByTagName(e)).length && (n = !0)
                        }), n || (r += 10)
                    }), 0 < r && (t = "The page is missing heading(s) within a section tag on the page. It happens " + r / 10 + " times.")), {
                        id: "sections",
                        title: "Use headings tags within section tags to better structure your page",
                        description: "Section tags should have at least one heading element as a direct descendant.",
                        advice: t,
                        score: Math.max(0, 100 - r),
                        weight: 0,
                        offending: [],
                        tags: ["accessibility", "html"]
                    }
                }()
            } catch (e) {
                r.sections = e.message
            }
            try {
                n.table = function() {
                    "use strict";
                    var e = Array.prototype.slice.call(window.document.getElementsByTagName("table")),
                        n = 0,
                        r = [];
                    return e.forEach(function(e) {
                        0 === e.getElementsByTagName("caption").length && (n += 5, e.id && r.push(e.id));
                        var t = e.getElementsByTagName("tr");
                        t[0] && 0 === t[0].getElementsByTagName("th").length && (n += 5, e.id && r.push(e.id))
                    }), {
                        id: "table",
                        title: "Use caption and th in tables",
                        description: "Add a caption element to give the table a proper heading or summary. Use th elements to denote column and row headings. Make use of their scope and other attributes to clearly associate what belongs to which. https://www.marcozehe.de/2015/12/14/the-web-accessibility-basics/",
                        advice: 0 < n ? "The page has tables that are missing caption, please use them to give them a proper heading or summary." : "",
                        score: Math.max(0, 100 - n),
                        weight: 5,
                        offending: r,
                        tags: ["accessibility", "html"]
                    }
                }()
            } catch (e) {
                r.table = e.message
            }
            e.accessibility = {
                adviceList: n
            }, 0 < Object.keys(r).length && (t.accessibility = r);
            var a = {},
                o = {};
            try {
                a.charset = function() {
                    "use strict";
                    var e = 100,
                        t = "",
                        n = document.characterSet;
                    return null === n ? (t = "The page is missing a character set. If you use Chrome/Firefox we know you are missing it, if you use another browser, it could be an implementation problem.", e = 0) : "UTF-8" !== n && (t = "You are not using charset UTF-8?", e = 50), {
                        id: "charset",
                        title: "Declare a charset in your document",
                        description: "The Unicode Standard (UTF-8) covers (almost) all the characters, punctuations, and symbols in the world. Please use that.",
                        advice: t,
                        score: e,
                        weight: 2,
                        offending: [],
                        tags: ["bestpractice"]
                    }
                }()
            } catch (e) {
                o.charset = e.message
            }
            try {
                a.doctype = function() {
                    "use strict";
                    var e = 100,
                        t = "",
                        n = document.doctype;
                    return null === n ? (t = "The page is missing a doctype. Please use <!DOCTYPE html>.", e = 0) : ("html" !== n.name.toLowerCase() || "" !== n.systemId && "about:legacy-compat" !== n.systemId.toLowerCase()) && (t = "Just do yourself a favor and use the HTML5 doctype declaration: <!DOCTYPE html>", e = 25), {
                        id: "doctype",
                        title: "Declare a doctype in your document",
                        description: "The <!DOCTYPE> declaration is not an HTML tag; it is an instruction to the web browser about what version of HTML the page is written in.",
                        advice: t,
                        score: e,
                        weight: 2,
                        offending: [],
                        tags: ["bestpractice"]
                    }
                }()
            } catch (e) {
                o.doctype = e.message
            }
            try {
                a.httpsH2 = function() {
                    "use strict";
                    var e = document.URL,
                        t = i.getConnectionType(),
                        n = 100,
                        r = "";
                    return -1 < e.indexOf("https://") && -1 === t.indexOf("h2") && (n = 0, r = "The page is using HTTPS but not HTTP/2. Change to HTTP/2 to follow new best practice with compressed headers and maybe make the site faster."), {
                        id: "httpsH2",
                        title: "Serve your content using HTTP/2",
                        description: "Using HTTP/2 together with HTTPS is the new best practice. If you use HTTPS (you should), you should also use HTTP/2 since you will then get compressed headers. However it may not be faster for all users.",
                        advice: r,
                        score: n,
                        weight: 2,
                        offending: [],
                        tags: ["bestpractice"]
                    }
                }()
            } catch (e) {
                o.httpsH2 = e.message
            }
            try {
                a.language = function() {
                    "use strict";
                    var e = document.getElementsByTagName("html"),
                        t = 100,
                        n = e[0].getAttribute("lang"),
                        r = "";
                    return 0 < e.length ? null === n && (t = 0, r = 'The page is missing a language definition in the HTML tag. Define it with <html lang="YOUR_LANGUAGE_CODE">') : (t = 0, r = "What! The page is missing the HTML tag!"), {
                        id: "language",
                        title: "Declare the language code for your document",
                        description: "According to the W3C recommendation you should declare the primary language for each Web page with the lang attribute inside the <html> tag https://www.w3.org/International/questions/qa-html-language-declarations#basics.",
                        advice: r,
                        score: t,
                        weight: 3,
                        offending: [],
                        tags: ["bestpractice"]
                    }
                }()
            } catch (e) {
                o.language = e.message
            }
            try {
                a.metaDescription = function(e) {
                    "use strict";
                    var t = 100,
                        n = "",
                        r = Array.prototype.slice.call(document.querySelectorAll("meta[name][content]")),
                        a = 0 < (r = r.filter(e.caseInsensitiveAttributeValueFilter("name", "description"))).length ? r[0].getAttribute("content") : "";
                    return 0 === a.length ? (n = "The page is missing a meta description.", t = 0) : 155 < a.length && (n = "The meta description is too long. It has " + a.length + " characters, the recommended max is 155", t = 50), {
                        id: "metaDescription",
                        title: "Meta description",
                        description: "Use a page description to make the page more relevant to search engines.",
                        advice: n,
                        score: t,
                        weight: 5,
                        offending: [],
                        tags: ["bestpractice"]
                    }
                }(i)
            } catch (e) {
                o.metaDescription = e.message
            }
            try {
                a.optimizely = function(t) {
                    "use strict";
                    var n = 100,
                        e = t.getSynchJSFiles(document.head),
                        r = "",
                        a = [];
                    return e.forEach(function(e) {
                        "cdn.optimizely.com" === t.getHostname(e) && (a.push(e), n = 0, r = "The page is using Optimizely. Use it with care because it hurts your performance. Only turn it on (= load the JavaScript) when you run your A/B tests. Then when you are finished make sure to turn it off.")
                    }), {
                        id: "optimizely",
                        title: "Only use Optimizely when you need it",
                        description: "Use Optimizely with care because it hurts your performance since Javascript is loaded synchronously inside of the head tag, making the first paint happen later. Only turn on Optimzely (= load the javascript) when you run your A/B tests.",
                        advice: r,
                        score: n,
                        weight: 2,
                        offending: a,
                        tags: ["bestpractice"]
                    }
                }(i)
            } catch (e) {
                o.optimizely = e.message
            }
            try {
                a.pageTitle = function() {
                    "use strict";
                    var e = 100,
                        t = "",
                        n = document.title;
                    return 0 === n.length ? (t = "The page is missing a title.", e = 0) : 60 < n.length && (t = "The title is too long by " + (n.length - 60) + " characters. The recommended max is 60", e = 50), {
                        id: "pageTitle",
                        title: "Page title",
                        description: "Use a title to make the page more relevant to search engines.",
                        advice: t,
                        score: e,
                        weight: 5,
                        offending: [],
                        tags: ["bestpractice"]
                    }
                }()
            } catch (e) {
                o.pageTitle = e.message
            }
            try {
                a.spdy = function() {
                    "use strict";
                    var e = 100,
                        t = "";
                    return -1 !== i.getConnectionType().indexOf("spdy") && (e = 0, t = "The page is using SPDY. Chrome dropped support for SPDY in Chrome 51. Change to HTTP/2 asap."), {
                        id: "spdy",
                        title: "EOL for SPDY in Chrome",
                        description: "Chrome dropped supports for SPDY in Chrome 51, upgrade to HTTP/2 as soon as possible. The page has more users (browsers) supporting HTTP/2 than supports SPDY.",
                        advice: t,
                        score: e,
                        weight: 1,
                        offending: [],
                        tags: ["bestpractice"]
                    }
                }()
            } catch (e) {
                o.spdy = e.message
            }
            try {
                a.url = function() {
                    "use strict";
                    var e = 100,
                        t = "",
                        n = document.URL;
                    return -1 < n.indexOf("?") && n.indexOf("jsessionid") > n.indexOf("?") && (e = 0, t = "The page has the session id for the user as a parameter, please change so the session handling is done only with cookies. "), 1 < (n.match(/&/g) || []).length && (e -= 50, t += "The page is using more than two request parameters. You should really rethink and try to minimize the number of parameters. "), 100 < n.length && (e -= 10, t += "The URL is " + n.length + " characters long. Try to make it less than 100 characters. "), (-1 < n.indexOf(" ") || -1 < n.indexOf("%20")) && (e -= 10, t += "Could the developer or the CMS be on Windows? Avoid using spaces in the URLs, use hyphens or underscores. "), {
                        id: "url",
                        title: "Have a good URL format",
                        description: "A clean URL is good for the user and for SEO. Make them human readable, avoid too long URLs, spaces in the URL, too many request parameters, and never ever have the session id in your URL.",
                        advice: t,
                        score: e < 0 ? 0 : e,
                        weight: 2,
                        offending: [],
                        tags: ["bestpractice"]
                    }
                }()
            } catch (e) {
                o.url = e.message
            }
            e.bestpractice = {
                adviceList: a
            }, 0 < Object.keys(o).length && (t.bestpractice = o);
            var s = {},
                c = {};
            try {
                s.amp = function() {
                    "use strict";
                    var e = document.getElementsByTagName("html")[0];
                    return !!(e && e.getAttribute("amp-version") || window.AMP) && (e.getAttribute("amp-version") || !0)
                }()
            } catch (e) {
                c.amp = e.message
            }
            try {
                s.browser = function() {
                    "use strict";
                    var e = "unknown",
                        t = window.navigator.userAgent.match(/(Chrome|Firefox)\/(\S+)/);
                    return e = t ? t[1] + " " + t[2] : e
                }()
            } catch (e) {
                c.browser = e.message
            }
            try {
                s.connectionType = function() {
                    "use strict";
                    return i.getConnectionType()
                }()
            } catch (e) {
                c.connectionType = e.message
            }
            try {
                s.documentHeight = function() {
                    "use strict";
                    return Math.max(document.body.scrollHeight, document.body.offsetHeight, document.documentElement.clientHeight, document.documentElement.scrollHeight, document.documentElement.offsetHeight)
                }()
            } catch (e) {
                c.documentHeight = e.message
            }
            try {
                s.documentTitle = function() {
                    "use strict";
                    return document.title
                }()
            } catch (e) {
                c.documentTitle = e.message
            }
            try {
                s.documentWidth = function() {
                    "use strict";
                    return Math.max(document.body.scrollWidth, document.body.offsetWidth, document.documentElement.clientWidth, document.documentElement.scrollWidth, document.documentElement.offsetWidth)
                }()
            } catch (e) {
                c.documentWidth = e.message
            }
            try {
                s.domDepth = function() {
                    "use strict";

                    function o(e) {
                        var t = 0;
                        if (e.parentNode)
                            for (; e = e.parentNode;) t++;
                        return t
                    }
                    var e = function(e) {
                        for (var t = e.getElementsByTagName("*"), n = t.length, r = 0, a = 0; n--;) {
                            var i = o(t[n]);
                            a < i && (a = i), r += i
                        }
                        return {
                            avg: r / t.length,
                            max: a
                        }
                    }(document);
                    return {
                        avg: Math.round(e.avg),
                        max: e.max
                    }
                }()
            } catch (e) {
                c.domDepth = e.message
            }
            try {
                s.domElements = function() {
                    "use strict";
                    return document.getElementsByTagName("*").length
                }()
            } catch (e) {
                c.domElements = e.message
            }
            try {
                s.head = function(e) {
                    "use strict";
                    return {
                        jssync: e.getSynchJSFiles(document.head),
                        jsasync: e.getAsynchJSFiles(document.head),
                        css: e.getCSSFiles(document.head)
                    }
                }(i)
            } catch (e) {
                c.head = e.message
            }
            try {
                s.iframes = function() {
                    "use strict";
                    return document.getElementsByTagName("iframe").length
                }()
            } catch (e) {
                c.iframes = e.message
            }
            try {
                s.jsframework = function() {
                    "use strict";
                    return {
                        angular: !!window.angular && window.angular.version.full,
                        backbone: !!window.Backbone && window.Backbone.VERSION,
                        preact: !!window.preact,
                        vue: !!window.Vue
                    }
                }()
            } catch (e) {
                c.jsframework = e.message
            }
            try {
                s.localStorageSize = function() {
                    "use strict";
                    return function(e) {
                        if (e) {
                            for (var t = e.length || Object.keys(e).length, n = 0, r = 0; r < t; r++) {
                                var a = e.key(r),
                                    i = e.getItem(a);
                                n += a.length + i.length
                            }
                            return n
                        }
                        return 0
                    }(window.localStorage)
                }()
            } catch (e) {
                c.localStorageSize = e.message
            }
            try {
                s.metaDescription = function() {
                    "use strict";
                    var e = document.querySelector('meta[name="description"]'),
                        t = document.querySelector('meta[property="og:description"]');
                    return e ? e.getAttribute("content") : t ? t.getAttribute("content") : ""
                }()
            } catch (e) {
                c.metaDescription = e.message
            }
            try {
                s.networkConnectionType = function() {
                    "use strict";
                    return window.navigator.connection ? window.navigator.connection.effectiveType : "unknown"
                }()
            } catch (e) {
                c.networkConnectionType = e.message
            }
            try {
                s.resourceHints = function(e) {
                    "use strict";
                    return {
                        "dns-prefetch": e.getResourceHintsHrefs("dns-prefetch"),
                        preconnect: e.getResourceHintsHrefs("preconnect"),
                        prefetch: e.getResourceHintsHrefs("prefetch"),
                        prerender: e.getResourceHintsHrefs("prerender")
                    }
                }(i)
            } catch (e) {
                c.resourceHints = e.message
            }
            try {
                s.responsive = function() {
                    "use strict";
                    var e = !0,
                        t = document.body.scrollWidth,
                        n = window.innerWidth,
                        r = document.body.children;
                    for (var a in n < t && (e = !1), r) r[a].scrollWidth > n && (e = !1);
                    return e
                }()
            } catch (e) {
                c.responsive = e.message
            }
            try {
                s.scripts = function() {
                    "use strict";
                    return document.getElementsByTagName("script").length
                }()
            } catch (e) {
                c.scripts = e.message
            }
            try {
                s.serializedDomSize = function() {
                    "use strict";
                    return document.body.innerHTML.length
                }()
            } catch (e) {
                c.serializedDomSize = e.message
            }
            try {
                s.serviceWorker = function() {
                    "use strict";
                    return "serviceWorker" in navigator && (!!navigator.serviceWorker.controller && ("activated" === navigator.serviceWorker.controller.state && navigator.serviceWorker.controller.scriptURL))
                }()
            } catch (e) {
                c.serviceWorker = e.message
            }
            try {
                s.sessionStorageSize = function() {
                    "use strict";
                    return function(e) {
                        for (var t = e.length || Object.keys(e).length, n = 0, r = 0; r < t; r++) {
                            var a = e.key(r),
                                i = e.getItem(a);
                            n += a.length + i.length
                        }
                        return n
                    }(window.sessionStorage)
                }()
            } catch (e) {
                c.sessionStorageSize = e.message
            }
            try {
                s.thirdparty = function() {
                    "use strict";
                    return {
                        boomerang: !!window.BOOMR && window.BOOMR.version,
                        facebook: !!window.FB,
                        gtm: !!window.google_tag_manager,
                        ga: !!window.ga,
                        jquery: !!window.jQuery && window.jQuery.fn.jquery,
                        newrelic: !!window.newrelic,
                        matomo: !!window.Piwik || !!window.Matomo
                    }
                }()
            } catch (e) {
                c.thirdparty = e.message
            }
            try {
                s.userTiming = function() {
                    "use strict";
                    var e = 0,
                        t = 0;
                    return window.performance && window.performance.getEntriesByType && (t = window.performance.getEntriesByType("measure").length, e = window.performance.getEntriesByType("mark").length), {
                        marks: e,
                        measures: t
                    }
                }()
            } catch (e) {
                c.userTiming = e.message
            }
            try {
                s.windowSize = function() {
                    "use strict";
                    return (window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth) + "x" + (window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight)
                }()
            } catch (e) {
                c.windowSize = e.message
            }
            e.info = s, 0 < Object.keys(c).length && (t.info = c);
            var u = {},
                h = {};
            try {
                u.avoidScalingImages = function(e) {
                    "use strict";
                    for (var t = "", n = 0, r = [], a = Array.prototype.slice.call(document.getElementsByTagName("img")), i = 0, o = a.length; i < o; i++) {
                        var s = a[i];
                        s.clientWidth + 100 < s.naturalWidth && 0 < s.clientWidth && (r.push(e.getAbsoluteURL(s.currentSrc)), n += 10)
                    }
                    return 0 < n && (t = "The page has " + n / 10 + " image(s) that are scaled more than 100 pixels. It would be better if those images are sent so the browser don't need to scale them."), {
                        id: "avoidScalingImages",
                        title: "Don't scale images in the browser",
                        description: "It's easy to scale images in the browser and make sure they look good in different devices, however that is bad for performance! Scaling images in the browser takes extra CPU time and will hurt performance on mobile. And the user will download extra kilobytes (sometimes megabytes) of data that could be avoided. Don't do that, make sure you create multiple version of the same image server-side and serve the appropriate one.",
                        advice: t,
                        score: Math.max(0, 100 - n),
                        weight: 5,
                        offending: r,
                        tags: ["performance", "image"]
                    }
                }(i)
            } catch (e) {
                h.avoidScalingImages = e.message
            }
            try {
                u.cssPrint = function(e) {
                    "use strict";
                    for (var t = [], n = document.getElementsByTagName("link"), r = 0, a = n.length; r < a; r++) "print" === n[r].media && t.push(e.getAbsoluteURL(n[r].href));
                    var i = 10 * t.length;
                    return {
                        id: "cssPrint",
                        title: "Do not load specific print stylesheets.",
                        description: "Loading a specific stylesheet for printing slows down the page, even though it is not used. You can include the print styles inside your other CSS file(s) just by using an @media query targeting type print.",
                        advice: 0 < t.length ? "The page has " + t.length + " print stylesheets. You should include that stylesheet using @media type print instead." : "",
                        score: Math.max(0, 100 - i),
                        weight: 1,
                        offending: t,
                        tags: ["performance", "css"]
                    }
                }(i)
            } catch (e) {
                h.cssPrint = e.message
            }
            try {
                u.fastRender = function(n) {
                    "use strict";
                    var t = "",
                        r = 0,
                        a = [],
                        e = n.getCSSFiles(document.head),
                        i = n.getSynchJSFiles(document.head),
                        o = document.domain,
                        s = [],
                        c = 0,
                        u = 0,
                        h = n.getResourceHintsHrefs("preconnect").map(function(e) {
                            return n.getHostname(e)
                        });

                    function d(e) {
                        var t = n.getHostname(e);
                        t !== o ? (a.push(e), n.exists(t, s) || (r += n.exists(t, h) ? 5 : 10, s.push(t))) : a.push(e), r += 5
                    }
                    return n.isHTTP2() ? (0 < e.length && (t = "Make sure that the server pushes your CSS resources for faster rendering. ", e.forEach(function(e) {
                        14500 < n.getTransferSize(e) && (a.push(e), r += 5, c++, t += "The style " + e + " is larger than the magic number TCP window size 14.5 kB. Make the file smaller and the page will render faster. ")
                    })), 0 < i.length && (r += 10 * i.length, i.forEach(function(e) {
                        a.push(e), u++
                    }), t += "Avoid loading synchronously JavaScript inside of head, you shouldn't need JavaScript to render your page! ")) : (e.forEach(function(e) {
                        d(e)
                    }), c = e.length, i.forEach(function(e) {
                        d(e)
                    }), u = i.length), 0 < a.length && (t += "The page has " + c + " render blocking CSS request(s) and " + u + " blocking JavaScript request(s) inside of head."), {
                        id: "fastRender",
                        title: "Avoid slowing down the critical rendering path",
                        description: "The critical rendering path is what the browser needs to do to start rendering the page. Every file requested inside of the head element will postpone the rendering of the page, because the browser need to do the request. Avoid loading JavaScript synchronously inside of the head (you should not need JavaScript to render the page), request files from the same domain as the main document (to avoid DNS lookups) and inline CSS or use server push for really fast rendering and a short rendering path.",
                        advice: t,
                        score: Math.max(0, 100 - r),
                        weight: 10,
                        offending: a,
                        tags: ["performance"]
                    }
                }(i)
            } catch (e) {
                h.fastRender = e.message
            }
            try {
                u.googletagmanager = function() {
                    "use strict";
                    var e = 100;
                    return window.google_tag_manager && (e = 0), {
                        id: "googletagmanager",
                        title: "Avoid using Google Tag Manager",
                        description: "Google Tag Manager makes it possible for non tech users to add scripts to your page that will downgrade performance.",
                        advice: 0 === e ? "The page is using Google Tag Manager, this is a performance risk since non-tech users can add JavaScript to your page." : "",
                        score: e,
                        weight: 5,
                        offending: [],
                        tags: ["performance", "js"]
                    }
                }()
            } catch (e) {
                h.googletagmanager = e.message
            }
            try {
                u.inlineCss = function() {
                    "use strict";
                    var e = "",
                        t = 0,
                        n = [],
                        r = i.getCSSFiles(document.head),
                        a = Array.prototype.slice.call(window.document.head.getElementsByTagName("style"));
                    return i.isHTTP2() && 0 < r.length && 0 < a.length ? (t += 5, e = "The page has both inline CSS and CSS requests even though it uses a HTTP/2-ish connection. If you have many users on slow connections, it can be better to only inline the CSS. Run your own tests and check the waterfall graph to see what happens.") : i.isHTTP2() && 0 < a.length && 0 === r.length ? e += "The page has inline CSS and uses HTTP/2. Do you have a lot of users with slow connections on the site? It is good to inline CSS when using HTTP/2. If not, and your server supports server push, you can probably push the CSS files instead." : i.isHTTP2() && 0 < r.length && (e += "It is always faster for the user if you inline CSS instead of making a CSS request."), i.isHTTP2() || (0 < r.length && 0 === a.length && (t += 10 * r.length, e = "The page loads " + r.length + " CSS request(s) inside of head, try to inline the CSS for the first render and lazy load the rest.", n.push.apply(n, r)), 0 < a.length && 0 < r.length && (t += 10, e += "The page has both inline styles as well as it is requesting " + r.length + " CSS file(s) inside of the head. Let's only inline CSS for really fast render.", n.push.apply(n, r))), {
                        id: "inlineCss",
                        title: "Inline CSS for faster first render",
                        description: "In the early days of the Internet, inlining CSS was one of the ugliest things you can do. That has changed if you want your page to start rendering fast for your user. Always inline the critical CSS when you use HTTP/1 and HTTP/2 (avoid doing CSS requests that block rendering) and lazy load and cache the rest of the CSS. It is a little more complicated when using HTTP/2. Does your server support HTTP push? Then maybe that can help. Do you have a lot of users on a slow connection and are serving large chunks of HTML? Then it could be better to use the inline technique, becasue some servers always prioritize HTML content over CSS so the user needs to download the HTML first, before the CSS is downloaded.",
                        advice: e,
                        score: Math.max(0, 100 - t),
                        weight: 7,
                        offending: n,
                        tags: ["performance", "css"]
                    }
                }()
            } catch (e) {
                h.inlineCss = e.message
            }
            try {
                u.jquery = function() {
                    "use strict";
                    var e = [];
                    if ("function" == typeof window.jQuery) {
                        e.push(window.jQuery.fn.jquery);
                        for (var t = window.jQuery; t.fn && t.fn.jquery && (t = window.jQuery.noConflict(!0), window.jQuery && window.jQuery.fn) && t.fn.jquery !== window.jQuery.fn.jquery;) e.push(window.jQuery.fn.jquery)
                    }
                    return {
                        id: "jquery",
                        title: "Avoid using more than one jQuery version per page",
                        description: "There are sites out there that use multiple versions of jQuery on the same page. You shouldn't do that because the user will then unnecessarily download extra data. Cleanup the code and make sure you only use one version.",
                        advice: 1 < e.length ? "The page uses " + e.length + " versions of jQuery! You only need one version, please remove the unnecessary version(s)." : "",
                        score: 1 < e.length ? 0 : 100,
                        weight: 4,
                        offending: e,
                        tags: ["jQuery", "performance"]
                    }
                }()
            } catch (e) {
                h.jquery = e.message
            }
            try {
                u.spof = function(n) {
                    "use strict";
                    var r = 0,
                        a = [],
                        i = [],
                        o = document.domain;
                    return n.getCSSFiles(document.head).forEach(function(e) {
                        var t = n.getHostname(e);
                        t !== o && (a.push(e), -1 === i.indexOf(t) && (i.push(t), r += 10))
                    }), n.getSynchJSFiles(document.head).forEach(function(e) {
                        var t = n.getHostname(e);
                        t !== o && (a.push(e), -1 === i.indexOf(t) && (i.push(t), r += 10))
                    }), {
                        id: "spof",
                        title: "Avoid Frontend single point of failures",
                        description: "A page can be stopped from loading in the browser if a single JavaScript, CSS, and in some cases a font, couldn't be fetched or is loading really slowly (the white screen of death). That is a scenario you really want to avoid. Never load 3rd-party components synchronously inside of the head tag.",
                        advice: 0 < a.length ? "The page has " + a.length + " requests inside of the head that can cause a SPOF (single point of failure). Load them asynchronously or move them outside of the document head." : "",
                        score: Math.max(0, 100 - r),
                        weight: 7,
                        offending: a,
                        tags: ["performance", "css", "js"]
                    }
                }(i)
            } catch (e) {
                h.spof = e.message
            }
            try {
                u.thirdPartyAsyncJs = function(a) {
                    "use strict";
                    var i = ["ajax.googleapis.com", "apis.google.com", ".google-analytics.com", "connect.facebook.net", "platform.twitter.com", "code.jquery.com", "platform.linkedin.com", ".disqus.com", "assets.pinterest.com", "widgets.digg.com", ".addthis.com", "code.jquery.com", "ad.doubleclick.net", ".lognormal.com", "embed.spotify.com"];

                    function e(e) {
                        for (var t = a.getHostname(e), n = 0, r = i.length; n < r; n++)
                            if (new RegExp(i[n]).test(t)) return !0;
                        return !1
                    }
                    for (var t = 0, n = [], r = a.getSynchJSFiles(document), o = 0, s = r.length; o < s; o++) e(r[o]) && (n.push(r[o]), t += 10);
                    return {
                        id: "thirdPartyAsyncJs",
                        title: "Always load third-party JavaScript asynchronously",
                        description: "Use JavaScript snippets that load the JS files asynchronously in order to speed up the user experience and avoid blocking the initial load.",
                        advice: 0 < n.length ? "The page has " + n.length + " synchronous 3rd-party JavaScript request(s). Change it to be asynchronous instead." : "",
                        score: Math.max(0, 100 - t),
                        weight: 5,
                        offending: n,
                        tags: ["performance", "js"]
                    }
                }(i)
            } catch (e) {
                h.thirdPartyAsyncJs = e.message
            }
            e.performance = {
                adviceList: u
            }, 0 < Object.keys(h).length && (t.performance = h);
            var d = {},
                g = {};
            try {
                d.ampPrivacy = function() {
                    "use strict";
                    var e = 100,
                        t = document.getElementsByTagName("html")[0];
                    return (t && t.getAttribute("amp-version") || window.AMP) && (e = 0), {
                        id: "ampPrivacy",
                        title: "Avoid including AMP",
                        description: "You share share private user information with Google that your user hasn't agreed on sharing.",
                        advice: 0 === e ? "The page is using AMP, that makes you share private user information with Google." : "",
                        score: e,
                        weight: 8,
                        offending: [],
                        tags: ["privacy"]
                    }
                }()
            } catch (e) {
                g.ampPrivacy = e.message
            }
            try {
                d.facebook = function() {
                    "use strict";
                    var e = 100;
                    return window.FB && (e = 0), {
                        id: "facebook",
                        title: "Avoid including Facebook",
                        description: "You share share private user information with Facebook that your user hasn't agreed on sharing.",
                        advice: 0 === e ? "The page gets content from Facebook. That means you share your users private information with Facebook." : "",
                        score: e,
                        weight: 8,
                        offending: [],
                        tags: ["privacy"]
                    }
                }()
            } catch (e) {
                g.facebook = e.message
            }
            try {
                d.ga = function() {
                    "use strict";
                    var e = 100;
                    return window.ga && window.ga.create && (e = 0), {
                        id: "ga",
                        title: "Avoid using Google Analytics",
                        description: "Google Analytics share private user information with Google that your user hasn't agreed on sharing.",
                        advice: 0 === e ? "The page is using Google Analytics meaning you share your users private information with Google. You should use analytics that care about user privacy, something like https://matomo.org." : "",
                        score: e,
                        weight: 8,
                        offending: [],
                        tags: ["privacy"]
                    }
                }()
            } catch (e) {
                g.ga = e.message
            }
            try {
                d.https = function() {
                    "use strict";
                    var e = 100,
                        t = "";
                    return -1 === document.URL.indexOf("https://") && (e = 0, t = "What!! The page is not using HTTPS. Every unencrypted HTTP request reveals information about user’s behavior, read more about it at https://https.cio.gov/everything/. You can get a totally free SSL/TLS certificate from https://letsencrypt.org/."), {
                        id: "https",
                        title: "Serve your content securely",
                        description: "A page should always use HTTPS (https://https.cio.gov/everything/). You also need that for HTTP/2. You can get your free SSL/TLC certificate from https://letsencrypt.org/.",
                        advice: t,
                        score: e,
                        weight: 10,
                        offending: [],
                        tags: ["privacy"]
                    }
                }()
            } catch (e) {
                g.https = e.message
            }
            try {
                d.surveillance = function() {
                    "use strict";
                    for (var e = 100, t = document.domain, n = [], r = [".google.", "facebook.com", "youtube.", "yahoo.com"], a = 0; a < r.length; a++) - 1 < t.indexOf(r[a]) && (e = 0, n.push(t));
                    return {
                        id: "surveillance",
                        title: "Avoid using surveillance web sites",
                        description: "Do not use web sites that harvest private user information and sell it to other companies.",
                        advice: 0 === e ? t + " uses harvest user information and sell it to other companies without the users agreement. That is not OK." : "",
                        score: e,
                        weight: 10,
                        offending: n,
                        tags: ["privacy"]
                    }
                }()
            } catch (e) {
                g.surveillance = e.message
            }
            try {
                d.youtube = function() {
                    "use strict";
                    var e = 100;
                    return window.YT && (e = 0), {
                        id: "youtube",
                        title: "Avoid including Youtube videos",
                        description: "If you include Youtube videos on your page, you are sharing private user information with Google.",
                        advice: 0 === e ? "The page is including code from Youtube. You share user private information with Google. Instead you can host a video screenshot and let the user choose to go to Youtube or not, by clicking on the screenshot. You can look at http://labnol.org/?p=27941 and make sure you host your screenshot yourself. Or choose another video service." : "",
                        score: e,
                        weight: 6,
                        offending: [],
                        tags: ["privacy"]
                    }
                }()
            } catch (e) {
                g.youtube = e.message
            }
            e.privacy = {
                adviceList: d
            }, 0 < Object.keys(g).length && (t.privacy = g);
            var y, l, m, p, f = {},
                v = {};
            try {
                f.firstPaint = function() {
                    "use strict";
                    var e = window.performance,
                        t = e.timing,
                        n = e.getEntriesByType("paint");
                    if (0 < n.length) {
                        for (var r = 0; r < n.length; r++)
                            if ("first-paint" === n[r].name) return Number(n[r].startTime.toFixed(0))
                    } else {
                        if (t.timeToNonBlankPaint) return Number((t.timeToNonBlankPaint - t.navigationStart).toFixed(0));
                        if ("number" == typeof t.msFirstPaint) return t.msFirstPaint - t.navigationStart
                    }
                }()
            } catch (e) {
                v.firstPaint = e.message
            }
            try {
                f.fullyLoaded = function() {
                    "use strict";
                    if (window.performance && window.performance.getEntriesByType) {
                        for (var e = window.performance.getEntriesByType("resource"), t = 0, n = 1, r = e.length; n < r; n++) e[n].responseEnd > t && (t = e[n].responseEnd);
                        return t
                    }
                    return -1
                }()
            } catch (e) {
                v.fullyLoaded = e.message
            }
            try {
                f.navigationTimings = function() {
                    "use strict";
                    var e = window.performance.timing,
                        t = {
                            navigationStart: 0,
                            unloadEventStart: 0 < e.unloadEventStart ? e.unloadEventStart - e.navigationStart : void 0,
                            unloadEventEnd: 0 < e.unloadEventEnd ? e.unloadEventEnd - e.navigationStart : void 0,
                            redirectStart: 0 < e.redirectStart ? e.redirectStart - e.navigationStart : void 0,
                            redirectEnd: 0 < e.redirectEnd ? e.redirectEnd - e.navigationStart : void 0,
                            fetchStart: e.fetchStart - e.navigationStart,
                            domainLookupStart: e.domainLookupStart - e.navigationStart,
                            domainLookupEnd: e.domainLookupEnd - e.navigationStart,
                            connectStart: e.connectStart - e.navigationStart,
                            connectEnd: e.connectEnd - e.navigationStart,
                            secureConnectionStart: e.secureConnectionStart ? e.secureConnectionStart - e.navigationStart : void 0,
                            requestStart: e.requestStart - e.navigationStart,
                            responseStart: e.responseStart - e.navigationStart,
                            responseEnd: e.responseEnd - e.navigationStart,
                            domLoading: e.domLoading - e.navigationStart,
                            domInteractive: e.domInteractive - e.navigationStart,
                            domContentLoadedEventStart: e.domContentLoadedEventStart - e.navigationStart,
                            domContentLoadedEventEnd: e.domContentLoadedEventEnd - e.navigationStart,
                            domComplete: e.domComplete - e.navigationStart,
                            loadEventStart: e.loadEventStart - e.navigationStart,
                            loadEventEnd: e.loadEventEnd - e.navigationStart
                        };
                    return Object.keys(t).forEach(function(e) {
                        void 0 === t[e] && delete t[e]
                    }), t
                }()
            } catch (e) {
                v.navigationTimings = e.message
            }
            try {
                f.rumSpeedIndex = (y = function(u) {
                    function c(e) {
                        var t = !1;
                        if (e.getBoundingClientRect) {
                            var n = e.getBoundingClientRect();
                            (t = {
                                top: Math.max(n.top, 0),
                                left: Math.max(n.left, 0),
                                bottom: Math.min(n.bottom, u.innerHeight || g.documentElement.clientHeight),
                                right: Math.min(n.right, u.innerWidth || g.documentElement.clientWidth)
                            }).bottom <= t.top || t.right <= t.left ? t = !1 : t.area = (t.bottom - t.top) * (t.right - t.left)
                        }
                        return t
                    }

                    function h(e, t) {
                        if (t) {
                            var n = c(e);
                            n && l.push({
                                url: t,
                                area: n.area,
                                rect: n
                            })
                        }
                    }
                    var d, a, g = (u = u || window).document,
                        l = [],
                        m = [],
                        p = .1;
                    try {
                        var f = u.performance.timing.navigationStart;
                        (function() {
                            for (var e = g.getElementsByTagName("*"), t = /url\(.*(http.*)\)/gi, n = 0; n < e.length; n++) {
                                var r = e[n],
                                    a = u.getComputedStyle(r);
                                if ("IMG" == r.tagName && h(r, r.src), a["background-image"]) {
                                    t.lastIndex = 0;
                                    var i = t.exec(a["background-image"]);
                                    i && 1 < i.length && h(r, i[1].replace('"', ""))
                                }
                                if ("IFRAME" == r.tagName) try {
                                    var o = c(r);
                                    if (o) {
                                        var s = y(r.contentWindow);
                                        s && l.push({
                                            tm: s,
                                            area: o.area,
                                            rect: o
                                        })
                                    }
                                } catch (e) {}
                            }
                        })(),
                        function() {
                            for (var e = {}, t = u.performance.getEntriesByType("resource"), n = 0; n < t.length; n++) e[t[n].name] = t[n].responseEnd;
                            for (var r = 0; r < l.length; r++) "tm" in l[r] || (l[r].tm = void 0 !== e[l[r].url] ? e[l[r].url] : 0)
                        }(),
                        function() {
                            try {
                                for (var e = performance.getEntriesByType("paint"), t = 0; t < e.length; t++)
                                    if ("first-paint" == e[t].name) {
                                        f = performance.getEntriesByType("navigation")[0].startTime, d = e[t].startTime - f;
                                        break
                                    }
                            } catch (e) {}
                            if (void 0 === d && "msFirstPaint" in u.performance.timing && (d = u.performance.timing.msFirstPaint - f), void 0 === d || d < 0 || 12e4 < d) {
                                d = u.performance.timing.responseStart - f;
                                var n = {},
                                    r = g.getElementsByTagName("head")[0].children;
                                for (t = 0; t < r.length; t++) {
                                    var a = r[t];
                                    "SCRIPT" == a.tagName && a.src && !a.async && (n[a.src] = !0), "LINK" == a.tagName && "stylesheet" == a.rel && a.href && (n[a.href] = !0)
                                }
                                for (var i = u.performance.getEntriesByType("resource"), o = !1, s = 0; s < i.length; s++)
                                    if (o || !n[i[s].name] || "script" != i[s].initiatorType && "link" != i[s].initiatorType) o = !0;
                                    else {
                                        var c = i[s].responseEnd;
                                        (void 0 === d || d < c) && (d = c)
                                    }
                            }
                            d = Math.max(d, 0)
                        }(),
                        function() {
                            for (var e = {
                                    0: 0
                                }, t = 0, n = 0; n < l.length; n++) {
                                var r = d;
                                "tm" in l[n] && l[n].tm > d && (r = l[n].tm), void 0 === e[r] && (e[r] = 0), e[r] += l[n].area, t += l[n].area
                            }
                            var a = Math.max(g.documentElement.clientWidth, u.innerWidth || 0) * Math.max(g.documentElement.clientHeight, u.innerHeight || 0);
                            if (0 < a && (a = Math.max(a - t, 0) * p, void 0 === e[d] && (e[d] = 0), e[d] += a, t += a), t) {
                                for (var i in e) e.hasOwnProperty(i) && m.push({
                                    tm: i,
                                    area: e[i]
                                });
                                m.sort(function(e, t) {
                                    return e.tm - t.tm
                                });
                                for (var o = 0, s = 0; s < m.length; s++) o += m[s].area, m[s].progress = o / t
                            }
                        }(),
                        function() {
                            if (m.length)
                                for (var e = a = 0, t = 0, n = 0; n < m.length; n++) {
                                    var r = m[n].tm - e;
                                    0 < r && t < 1 && (a += (1 - t) * r), e = m[n].tm, t = m[n].progress
                                } else a = d
                        }()
                    } catch (e) {}
                    return Number(a.toFixed(0))
                })() || -1
            } catch (e) {
                v.rumSpeedIndex = e.message
            }
            try {
                f.timings = function() {
                    "use strict";
                    var e = window.performance.timing;
                    return {
                        domainLookupTime: e.domainLookupEnd - e.domainLookupStart,
                        redirectionTime: e.fetchStart - e.navigationStart,
                        serverConnectionTime: e.connectEnd - e.connectStart,
                        serverResponseTime: e.responseEnd - e.requestStart,
                        pageDownloadTime: e.responseEnd - e.responseStart,
                        domInteractiveTime: e.domInteractive - e.navigationStart,
                        domContentLoadedTime: e.domContentLoadedEventStart - e.navigationStart,
                        pageLoadTime: e.loadEventStart - e.navigationStart,
                        frontEndTime: e.loadEventStart - e.responseEnd,
                        backEndTime: e.responseStart - e.navigationStart
                    }
                }()
            } catch (e) {
                v.timings = e.message
            }
            try {
                f.userTimings = function() {
                    "use strict";
                    var t = [],
                        n = [];
                    window.performance && window.performance.getEntriesByType && (Array.prototype.slice.call(window.performance.getEntriesByType("mark")).forEach(function(e) {
                        n.push({
                            name: e.name,
                            startTime: e.startTime
                        })
                    }), Array.prototype.slice.call(window.performance.getEntriesByType("measure")).forEach(function(e) {
                        t.push({
                            name: e.name,
                            duration: e.duration,
                            startTime: e.startTime
                        })
                    }));
                    return {
                        marks: n,
                        measures: t
                    }
                }()
            } catch (e) {
                v.userTimings = e.message
            }
            return e.timings = f, 0 < Object.keys(v).length && (t.timings = v), l = e, p = m = 0, Object.keys(l).forEach(function(e) {
                var n = 0,
                    r = 0,
                    a = l[e].adviceList;
                a && Object.keys(a).forEach(function(e) {
                    var t = a[e];
                    m += t.score * t.weight, n += t.score * t.weight, p += t.weight, r += t.weight
                }), 0 < r && (l[e].score = Math.round(n / r))
            }), l.score = Math.round(m / p), {
                advice: e,
                errors: t,
                url: document.URL,
                version: "3.6.0"
            }
        }(a)
    }
    console.error("Missing window or window document")
})();