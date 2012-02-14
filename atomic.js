/* Atomic Elements Selector Engine v0.1 (Beta)
	Copyright (c) 2012 Craig Pierce <craig@atomicjs.com>
	http://www.atomicjs.com */

/* THIS SOFTWARE HAS BEEN RELEASED IN "AS IS" CONDITION, WITHOUT ANY
	WARRANTY, AND IS AVAILABLE UNDER THE AS YOU WISH PUBLIC LICENSE. */

/* As You Wish Public License
	Copyright (c) 2012 Craig Pierce <craig@underctrl.com>
	http://www.underctrl.com/as-you-wish/
	
	Use and/or distribute exact copies of this license as you wish.
	
	Use and/or distribute exact copies of any works covered by this
	license as you wish.
	
	Modify any works covered by this license as you wish, so long
	as you:
	
		0. Retain for attribution all applicable copyrights and/or
			authorship notices.
		1. Use and/or distribute all resulting works under at least
			the same licenses as the originating work. */

;(function buildAtomicEngine(global, undefined){
	"use strict";
	
	var version = "0.1",
		
		dom = global.document,
		
		domReady = false,
		readyTimer = setInterval(checkDomReady, 50),
		readyCallbacks = [],
		
		atomicCache = {},
		
		cacheableRegex = /^(#document|body|html)$/i,
		readyStateRegex = /^(loaded|interactive|complete)$/i,
		commaSplitRegex = /\s*,\s*(?=(?:[^\)]|\([^\)]*\))*$)/,
		
		selectorReplaceRegex = new RegExp(
			"=([^'\"]+?)\\]|" +
			"\\[(.+?!=.+?)\\]|" +
			":not\\((.+?,.+?)\\)|" +
			"^([>~\\s\\+])|" + 
			"([>~\\s\\+])$|" +
			":(even|odd|selected|text|password|checkbox|radio|button|submit|reset|image|file|hidden)"
		, "gi");
	
	global.atomic = {
		version : version,
		options : {
			fallback : null,
			selectorOrder : false,
			useCache : true
		},
		ready : function (callback){
			domReady ? callback() : readyCallbacks.push(callback);
		},
		clearCache : function (){
			atomicCache = {};
		},
		get : function (selector, context, options){
			var defaults = global.atomic.options;
			
			if (!context){
				context = dom;
			}else if(!context.childNodes && context.length == undefined){
				options = context;
				context = dom;
			};
			
			options = (options || {});
			options.selectorOrder = (options.selectorOrder == undefined) ? defaults.selectorOrder : options.selectorOrder;
			options.useCache = (options.useCache == undefined) ? defaults.useCache : options.useCache;
			
			return getElements(selector.replace(selectorReplaceRegex, selectorReplace), context, options);
		}
	};
	
	if (dom.addEventListener){
		dom.addEventListener("DOMContentLoaded", handleDomReady, false);
		dom.addEventListener("load", handleDomReady, false);
	}else{
		dom.attachEvent("DOMContentLoaded", handleDomReady);
		dom.attachEvent("onload", handleDomReady);
	};
	
	function checkDomReady(){
		if (!domReady && readyStateRegex.test(dom.readyState)){
			handleDomReady();
		};
	};
	
	function handleDomReady(){
		if (!domReady){
			var x = -1,
				lenx = readyCallbacks.length;
			
			domReady = true;
			clearInterval(readyTimer);
			
			while (++x < lenx){
				readyCallbacks[x]();
			};
			
			readyCallbacks = null;
		};
	};
	
	function selectorReplace(match, capture1, capture2, capture3, capture4, capture5, capture6){
		var replacement = "",
			x = -1,
			lenx;
		
		if (capture1){
			replacement = ("='" + capture1 + "']");
		}else if (capture2){
			replacement = ":not([" + capture2.replace("!=", "=") + "])";
		}else if (capture3){
			var capture3Split = capture3.split(commaSplitRegex),
				append = "):not(";
			
			lenx = capture3Split.length;
			
			while (++x < lenx){
				replacement += (capture3Split[x] + append);
			};
			
			replacement = (":not(" + replacement.slice(0, -5));
		}else if (capture4){
			replacement = ("*" + capture4);
		}else if (capture5){
			replacement = (capture5 + "*");
		}else if (capture6){
			capture6 = capture6.toLowerCase();
			
			if (capture6 == "selected"){
				replacement = "[selected]";
			}else if (capture6 == "even" || capture6 == "odd"){
				replacement = (":nth-child(" + capture6 + ")");
			}else{
				replacement = ("[type='" + capture6 + "']");
			};
		};
		
		return replacement;
	};
	
	function getElements(selector, context, options){
		var atomicElements = [],
			
			selectors = selector.split(commaSplitRegex),
			x = -1,
			lenx = selectors.length,
			
			isDomOrder = (lenx == 1 || !options.selectorOrder),
			
			contextName = (context.nodeName || ""),
			
			isCacheable = cacheableRegex.test(contextName),
			useCache = (isCacheable && options.useCache),
			cacheKey = (selector + contextName + (isDomOrder ? "" : "sorder")),
			cacheItem = (useCache) ? atomicCache[cacheKey] : null;
		
		if (cacheItem){
			atomicElements = cacheItem;
		}else{
			var fallback = global.atomic.options.fallback,
				y = -1,
				leny = context.length;
			
			if (isDomOrder){
				if (contextName){
					atomicElements = atomicDeduplicator(performSelection(selector, context, fallback));
				}else{
					while (++y < leny){
						atomicElements = atomicDeduplicator(performSelection(selector, context[y], fallback), atomicElements);
					};
					
					atomicElements.sort(byDomOrder);
				};
			}else{
				if (contextName){
					while (++x < lenx){
						var selectorX = selectors[x],
							cacheKeyX = (selectorX + contextName),
							cacheItemX = (useCache) ? atomicCache[cacheKeyX] : null,
							atomicElementsX = (cacheItemX) ? cacheItemX : performSelection(selectorX, context, fallback);
						
						atomicElements = atomicDeduplicator(atomicElementsX, atomicElements);
						
						if (isCacheable && !cacheItemX){
							atomicCache[cacheKeyX] = atomicDeduplicator(atomicElementsX).slice(0);
						};
					};
				}else{
					context = atomicDeduplicator(context).sort(byDomOrder);
					
					while (++x < lenx){
						y = -1;
						
						while (++y < leny){
							atomicElements = atomicDeduplicator(performSelection(selectors[x], context[y], fallback), atomicElements);
						};
					};
				};
			};
			
			if (isCacheable){
				atomicCache[cacheKey] = atomicElements.slice(0);
			};
		};
		
		return atomicElements.slice(0);
	};
	
	function performSelection(selector, context, fallback){
		try{
			return context.querySelectorAll(selector);
		}catch (ex){
			if (fallback){
				return fallback(selector, context);
			};
			
			throw ex;
		};
	};
	
	function atomicDeduplicator(newElements, existingElements){
		var x = -1,
			lenx = newElements.length;
		
		if (existingElements && existingElements.length){
			var atomicElements = existingElements.slice(0),
				y,
				leny = atomicElements.length;
			
			loopx:
			while (++x < lenx){
				var element = newElements[x];
				
				y = -1;
				
				while (++y < leny){
					if (element == atomicElements[y]){
						continue loopx;
					};
				};
				
				atomicElements.push(element);
			};
			
			return atomicElements;
		}else if (Object.prototype.toString.call(newElements).toLowerCase().indexOf("array") == -1){
			var atomicElements = new Array(lenx);
			
			while (++x < lenx){
				atomicElements[x] = newElements[x];
			};
			
			return atomicElements;
		}else{
			return newElements;
		};
	};
	
	function byDomOrder(x, y){
		return (x.compareDocumentPosition) ? (3 - (x.compareDocumentPosition(y) & 6)) : (x.sourceIndex - y.sourceIndex);
	};
})(this);