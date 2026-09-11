(function(){
  "use strict";

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var header = document.getElementById("siteHeader");

  /* open at the top on reload, unless the address names a section */
  try {
    if("scrollRestoration" in history && !location.hash){
      history.scrollRestoration = "manual";
      window.addEventListener("load", function(){ window.scrollTo(0, 0); });
    }
  } catch(e){}

  /* header background + floating "Get in touch" button */
  var cta = document.getElementById("stickyCta");
  var ctaStart = document.getElementById("about");
  var ctaStop = document.getElementById("contact");
  function onScroll(){
    var y = window.pageYOffset || document.documentElement.scrollTop;
    header.classList.toggle("is-stuck", y > 24);
    if(cta && ctaStart && ctaStop){
      var started = y + header.offsetHeight >= ctaStart.offsetTop - 120;
      var nearEnd = y + window.innerHeight >= ctaStop.offsetTop + 120;
      cta.classList.toggle("on", started && !nearEnd);
    }
  }
  window.addEventListener("scroll", onScroll, { passive:true });
  onScroll();

  /* smooth scroll that accounts for the fixed header */
  document.querySelectorAll('a[href^="#"]').forEach(function(link){
    link.addEventListener("click", function(e){
      var id = link.getAttribute("href").slice(1);
      var target = id && document.getElementById(id);
      if(!target){ return; }
      e.preventDefault();
      var y = window.pageYOffset || document.documentElement.scrollTop;
      var top = target.getBoundingClientRect().top + y - header.offsetHeight;
      if(id === "contact"){
        top = Math.max(top, document.documentElement.scrollHeight - window.innerHeight);
      }
      window.scrollTo({ top: Math.max(0, top), behavior: reduce ? "auto" : "smooth" });
      try { history.pushState(null, "", "#" + id); } catch(err){}
    });
  });

  /* active nav item follows the section that fills most of the screen */
  var sectionLinks = [].slice.call(document.querySelectorAll('.nav a[href^="#"]'));
  var lockUntil = 0;
  function setActive(link){
    sectionLinks.forEach(function(a){
      a.classList.toggle("is-active", a === link);
      if(a === link){ a.setAttribute("aria-current", "true"); } else { a.removeAttribute("aria-current"); }
    });
  }
  function syncActive(){
    if(Date.now() < lockUntil){ return; }
    var top = header.offsetHeight, bottom = window.innerHeight, best = null, bestVisible = 0;
    /* the hero has no nav link, so while it fills the screen nothing is highlighted */
    [null].concat(sectionLinks).forEach(function(link){
      var section = link ? document.getElementById(link.getAttribute("href").slice(1)) : document.querySelector(".hero");
      if(!section){ return; }
      var box = section.getBoundingClientRect();
      var visible = Math.min(box.bottom, bottom) - Math.max(box.top, top);
      if(visible > bestVisible){ bestVisible = visible; best = link; }
    });
    setActive(best);
  }
  sectionLinks.forEach(function(link){
    link.addEventListener("click", function(){ setActive(link); lockUntil = Date.now() + 900; });
  });
  window.addEventListener("scroll", syncActive, { passive:true });
  window.addEventListener("resize", syncActive);
  window.addEventListener("load", syncActive);
  syncActive();

  /* reveal on scroll */
  var revealables = document.querySelectorAll(".reveal");
  if(reduce || !("IntersectionObserver" in window)){
    revealables.forEach(function(el){ el.classList.add("is-visible"); });
  } else {
    var revealObserver = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){ entry.target.classList.add("is-visible"); revealObserver.unobserve(entry.target); }
      });
    }, { threshold:.15, rootMargin:"0px 0px -40px 0px" });
    revealables.forEach(function(el){ revealObserver.observe(el); });
  }

  /* skills timeline: every position and year count is computed from the
     start dates against today, so the page never goes stale */
  var grid = document.getElementById("skillsGrid");
  if(grid){
    var now = new Date();
    var monthsBetween = function(from, to){
      return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
    };
    var parse = function(s){
      var p = s.split("-");
      return new Date(parseInt(p[0], 10), p[1] ? parseInt(p[1], 10) - 1 : 0, 1);
    };
    var start = parse(grid.getAttribute("data-start"));
    var span = Math.max(1, monthsBetween(start, now));
    var pct = function(d){ return Math.min(100, Math.max(0, monthsBetween(start, d) / span * 100)); };

    grid.querySelectorAll(".t-axis span[data-year]").forEach(function(label){
      var y = label.getAttribute("data-year");
      label.style.left = (y === "now" ? 100 : pct(new Date(parseInt(y, 10), 0, 1))) + "%";
    });

    /* rows with several periods ("2014-06:2016-01,2021-06:now") get one bar per
       period and a dashed gap between them; the year count adds the periods up */
    grid.querySelectorAll(".t-row[data-periods]").forEach(function(row){
      var track = row.querySelector(".t-track");
      var total = 0, prevEnd = null;
      row.getAttribute("data-periods").split(",").forEach(function(period, i){
        var ends = period.split(":");
        var from = parse(ends[0]);
        var to = ends[1] === "now" ? now : parse(ends[1]);
        var left = pct(from), right = pct(to);
        total += monthsBetween(from, to);
        if(prevEnd !== null){
          var gap = document.createElement("span");
          gap.className = "t-gap";
          gap.style.left = prevEnd + "%";
          gap.style.width = (left - prevEnd) + "%";
          track.appendChild(gap);
        }
        var fill = document.createElement("span");
        fill.className = "t-fill";
        fill.style.left = left + "%";
        fill.setAttribute("data-width", (right - left).toFixed(2));
        track.appendChild(fill);
        var dot = document.createElement("span");
        dot.className = "t-dot";
        dot.style.left = left + "%";
        track.appendChild(dot);
        prevEnd = right;
      });
      row.querySelector(".t-yrs").textContent = "~" + Math.max(1, Math.floor(total / 12)) + "y";
    });

    grid.querySelectorAll(".t-row[data-since]").forEach(function(row){
      var since = parse(row.getAttribute("data-since"));
      var left = pct(since);
      var fill = row.querySelector(".t-fill");
      var dot = row.querySelector(".t-dot");
      fill.style.left = left + "%";
      fill.setAttribute("data-width", (100 - left).toFixed(2));
      dot.style.left = left + "%";
      row.querySelector(".t-yrs").textContent = "~" + Math.max(1, Math.floor(monthsBetween(since, now) / 12)) + "y";
    });

    var fillBars = function(){
      grid.querySelectorAll(".t-fill[data-width]").forEach(function(bar){
        bar.style.width = bar.getAttribute("data-width") + "%";
      });
    };
    if(reduce || !("IntersectionObserver" in window)){
      fillBars();
    } else {
      new IntersectionObserver(function(entries, obs){
        entries.forEach(function(entry){ if(entry.isIntersecting){ fillBars(); obs.disconnect(); } });
      }, { threshold:.3 }).observe(grid);
    }
  }

  /* expandable lists */
  function label(text, arrow){ return text + ' <span class="more-arrow">' + arrow + "</span>"; }
  function wireToggle(btnId, listId, moreText, lessText){
    var btn = document.getElementById(btnId);
    var list = document.getElementById(listId);
    if(!btn || !list){ return; }
    btn.innerHTML = label(moreText, "↓");
    btn.addEventListener("click", function(){
      var open = list.classList.toggle("is-expanded");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.classList.toggle("is-open", open);
      btn.innerHTML = open ? label(lessText, "↑") : label(moreText, "↓");
      if(open){
        list.querySelectorAll(".reveal").forEach(function(el){ el.classList.add("is-visible"); });
      }
    });
  }
  wireToggle("moreTimeline", "timeline", "Show the earlier roles", "Show fewer roles");
  wireToggle("moreSkills", "skillsGrid", "Show the rest of my skills", "Show fewer skills");
})();
