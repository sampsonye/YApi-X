const baseController = require('controllers/base.js');
const interfaceModel = require('models/interface.js');
const projectModel = require('models/project.js');
// const wikiModel = require('../yapi-plugin-wiki/wikiModel.js');
const interfaceCatModel = require('models/interfaceCat.js');
const yapi = require('yapi.js');
const markdownIt = require('markdown-it');
const markdownItAnchor = require('markdown-it-anchor');
const markdownItTableOfContents = require('markdown-it-table-of-contents');
const defaultTheme = require('./defaultTheme.js');
const md = require('../../common/markdown');

// const htmlToPdf = require("html-pdf");
class exportController extends baseController {
  constructor(ctx) {
    super(ctx);
    this.catModel = yapi.getInst(interfaceCatModel);
    this.interModel = yapi.getInst(interfaceModel);
    this.projectModel = yapi.getInst(projectModel);
    
  }

  async handleListClass(pid, status) {
    let result = await this.catModel.list(pid),
      newResult = [];
    for (let i = 0, item, list; i < result.length; i++) {
      item = result[i].toObject();
      list = await this.interModel.listByInterStatus(item._id, status);
      list = list.sort((a, b) => {
        return a.index - b.index;
      });
      if (list.length > 0) {
        item.list = list;
        newResult.push(item);
      }
    }
    
    return newResult;
  }

  handleExistId(data) {
    function delArrId(arr, fn) {
      if (!Array.isArray(arr)) return;
      arr.forEach(item => {
        delete item._id;
        delete item.__v;
        delete item.uid;
        delete item.edit_uid;
        delete item.catid;
        delete item.project_id;

        if (typeof fn === 'function') fn(item);
      });
    }

    delArrId(data, function(item) {
      delArrId(item.list, function(api) {
        delArrId(api.req_body_form);
        delArrId(api.req_params);
        delArrId(api.req_query);
        delArrId(api.req_headers);
        if (api.query_path && typeof api.query_path === 'object') {
          delArrId(api.query_path.params);
        }
      });
    });

    return data;
  }

  async exportData(ctx) {
    let pid = ctx.request.query.pid;
    let type = ctx.request.query.type;
    let status = ctx.request.query.status;
    let isWiki = ctx.request.query.isWiki;

    if (!pid) {
      ctx.body = yapi.commons.resReturn(null, 200, 'pid 不为空');
    }
    let curProject, wikiData;
    let tp = '';
    try {
      curProject = await this.projectModel.get(pid);
      if (isWiki === 'true') {
        const wikiModel = require('../yapi-plugin-wiki/wikiModel.js');
        wikiData = await yapi.getInst(wikiModel).get(pid);
      }
      ctx.set('Content-Type', 'application/octet-stream');
      const list = await this.handleListClass(pid, status);

      switch (type) {
        case 'markdown': {
          tp = await createMarkdown.bind(this)(list, false);
          ctx.set('Content-Disposition', `attachment; filename=api.md`);
          return (ctx.body = tp);
        }
        case 'json': {
          let data = this.handleExistId(list);
          tp = JSON.stringify(data, null, 2);
          ctx.set('Content-Disposition', `attachment; filename=api.json`);
          return (ctx.body = tp);
        }
        default: {
          //默认为html
          tp = await createHtml.bind(this)(list);
          ctx.set('Content-Disposition', `attachment; filename=api.html`);
          return (ctx.body = tp);
        }
      }
    } catch (error) {
      yapi.commons.log(error, 'error');
      ctx.body = yapi.commons.resReturn(null, 502, '下载出错');
    }

    async function createHtml(list) {
      let md = await createMarkdown.bind(this)(list, true);
      let markdown = markdownIt({ html: true, breaks: true });
      markdown.use(markdownItAnchor); // Optional, but makes sense as you really want to link to something
      markdown.use(markdownItTableOfContents, {
        markerPattern: /^\[toc\]/im
      });

      // require('fs').writeFileSync('./a.markdown', md);
      let tp = unescape(markdown.render(md));
      // require('fs').writeFileSync('./a.html', tp);
      let left;
      // console.log('tp',tp);
      let content = tp.replace(
        /<div\s+?class="table-of-contents"\s*>[\s\S]*?<\/ul>\s*<\/div>/gi,
        function(match) {
          left = match;
          return '';
        }
      );

      return createHtml5(left || '', content);
    }

    function createHtml5(left, tp) {
      //html5模板
      let html = `<!DOCTYPE html>
      <html>
      <head>
      <title>${curProject.name}</title>
      <meta charset="utf-8" />
      ${defaultTheme}
      </head>
      <body>
        <div class="m-header">
          <a href="#" style="display: inherit;">
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 480 480" style="enable-background:new 0 0 480 480;width: 32px;height: 32px;" xml:space="preserve">
<style type="text/css">
	.st0{fill:url(#SVGID_1_);}
</style>
<linearGradient id="SVGID_1_" gradientUnits="userSpaceOnUse" x1="72.052" y1="62.4301" x2="436.0596" y2="438.1046">
	<stop offset="0" style="stop-color:#00DFD0"></stop>
	<stop offset="0.0937" style="stop-color:#03D6D2"></stop>
	<stop offset="0.2464" style="stop-color:#0BBED7"></stop>
	<stop offset="0.4393" style="stop-color:#1796DF"></stop>
	<stop offset="0.6647" style="stop-color:#295FEB"></stop>
	<stop offset="0.9147" style="stop-color:#3F19FA"></stop>
	<stop offset="1" style="stop-color:#4700FF"></stop>
</linearGradient>
<path class="st0" d="M398.41,263.87c-29.78,35.32-70.62,59.52-115.28,69.3V149.19c0-4.06,3.29-7.35,7.35-7.35h78.09
	c8.12,0,14.71-6.58,14.71-14.71V68.3c0-8.12-6.58-14.71-14.71-14.71H109.44c-8.12,0-14.71,6.58-14.71,14.71v58.83
	c0,8.12,6.58,14.71,14.71,14.71h78.09c4.06,0,7.35,3.29,7.35,7.35v184.14c-44.08-9.43-83.83-32.78-113.75-67.64
	c-4.96-5.78-13.67-6.48-19.75-1.89L8.31,303.85c-3.31,2.49-3.97,7.3-1.39,10.55c47.35,59.62,114,97.76,187.97,108.67
	c0.43,0.06,0.86,0.12,1.28,0.19c6.78,0.97,13.61,1.73,20.5,2.24c7.39,0.54,14.83,0.92,22.33,0.92c7.34,0,14.63-0.37,21.9-0.92
	c7.03-0.53,14-1.33,20.94-2.36c0.43-0.06,0.86-0.13,1.29-0.19c74.6-11.35,143.18-50.97,190-111.15c2.54-3.27,1.82-8.08-1.51-10.53
	l-53.51-39.45C411.99,257.3,403.31,258.06,398.41,263.87z"></path>
</svg>
          </a>
          <a href="#"><h1 class="title">通采2.0 标准接口文档</h1></a>
          <div class="nav">
            <a href="https://www.nbdeli.com/">通采2.0</a>
          </div>
        </div>
        <div class="g-doc">
          ${left}
          <div id="right" class="content-right">
          ${tp}
            <footer class="m-footer">
              <p>Build by <a href="https://www.nbdeli.com/">DELI</a>.</p>
            </footer>
          </div>
        </div>
      </body>
      </html>
      `;
      return html;
    }

    function createMarkdown(list, isToc) {
      //拼接markdown
      //模板
      let mdTemplate = ``;
      try {
        // 项目名称信息
        mdTemplate += md.createProjectMarkdown(curProject, wikiData);
        // 分类信息
        mdTemplate += md.createClassMarkdown(curProject, list, isToc);
        return mdTemplate;
      } catch (e) {
        yapi.commons.log(e, 'error');
        ctx.body = yapi.commons.resReturn(null, 502, '下载出错');
      }
    }
  }
}

module.exports = exportController;