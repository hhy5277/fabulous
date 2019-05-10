import traverse from "@babel/traverse";
import generate from "@babel/generator";
import { parse } from "../parser";
import {
  updateProperty,
  EditableBlock,
  getDeclarations,
  getRules
} from "./utils";
import { Inspector } from "./inspector";
import { NodeSource } from "postcss";

interface StyleExpresions {
  name: string;
  cssString: string;
  location: NodeSource;
}

function wrapWithDummySelector(declaraions: string) {
  return `.dummy{${declaraions}}`;
}

export function getTaggedTemplateExpressionStrings(ast: any) {
  const results: StyleExpresions[] = [];
  traverse(ast, {
    TaggedTemplateExpression(path: any) {
      const cssString = path.node.quasi.quasis[0].value.raw;
      results.push({
        name: path.parent.id.name,
        cssString: wrapWithDummySelector(cssString),
        location: path.node.quasi.loc
      });
    }
  });
  return results;
}

export function updateCSSProperty(
  content: string,
  name: string,
  property: string,
  value: string
) {
  const ast = parse(content);
  let updatedCssString = "";

  traverse(ast, {
    TaggedTemplateExpression(path: any) {
      if (path.parent.id.name === name) {
        const cssString = path.node.quasi.quasis[0].value.raw;
        updatedCssString = updateProperty(cssString, property, value);
        path.node.quasi.quasis[0].value.raw = updatedCssString;
      }
    }
  });

  const code = generate(ast).code;
}

export function getEditableBlocks(content: string) {
  const ast = parse(content);
  const styledBlocks = getTaggedTemplateExpressionStrings(ast);

  const results: EditableBlock[] = [];

  styledBlocks.forEach(({ cssString, location }) => {
    getRules(cssString).forEach(rule => {
      const declarations = getDeclarations(rule);
      results.push({
        selector: rule.selector,
        declarations,
        source: location,
        raw: rule.toString(),
        rule
      });
    });
  });
  return results;
}

const StyledComponentsInspector: Inspector = {
  getEdiableBlocks(fileContent: string) {
    return getEditableBlocks(fileContent);
  },
  updateProperty(activeBlock: EditableBlock, prop: string, value: string) {
    let updatedCSS = updateProperty(activeBlock.rule, prop, value);
    updatedCSS = updatedCSS.substr(7, updatedCSS.length); // removes .dummy{
    updatedCSS = updatedCSS.substr(0, updatedCSS.length - 1); // removes }
    updatedCSS = `\`${updatedCSS}\``;
    return updatedCSS;
  }
};
export default StyledComponentsInspector;