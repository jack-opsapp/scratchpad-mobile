/**
 * OpenAI Function Definitions for Slate Agent
 * Re-exports shared definitions and adds web-specific functions
 */

import {
  FUNCTION_DEFINITIONS as SHARED_FUNCTIONS,
  TERMINAL_FUNCTIONS,
  FRONTEND_ACTION_FUNCTIONS,
} from '@slate/shared';

// Web-specific functions not in the shared package
const WEB_SPECIFIC_FUNCTIONS = [
  {
    type: 'function',
    function: {
      name: 'propose_plan',
      description: `Propose a multi-step plan for complex operations. Each group is confirmed separately.

PARAM FORMATS:
- create_page: { name: "Page Name" }
- create_section: { name: "Section Name", pageName: "Page Name" }
- create_note: { content: "Note text", sectionName: "Section", tags: ["tag1"] }
- delete_page: { name: "Page Name" }
- delete_section: { name: "Section Name", pageName: "Page Name" }

EXAMPLE:
{
  summary: "Creating Q2 Planning with sections",
  groups: [
    { title: "Create Page", description: "Create Q2 Planning page", operations: [{ type: "create_page", params: { name: "Q2 Planning" }}]},
    { title: "Add Sections", description: "Add Goals and Tasks sections", operations: [
      { type: "create_section", params: { name: "Goals", pageName: "Q2 Planning" }},
      { type: "create_section", params: { name: "Tasks", pageName: "Q2 Planning" }}
    ]}
  ]
}`,
      parameters: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: 'Brief summary of the overall plan' },
          groups: {
            type: 'array',
            description: 'Array of operation groups to execute in sequence',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Short title for this group' },
                description: { type: 'string', description: 'What this group will do' },
                operations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: {
                        type: 'string',
                        enum: ['create_page', 'create_section', 'create_note', 'delete_note', 'delete_section', 'delete_page', 'bulk_add_tag', 'bulk_remove_tag', 'bulk_move_to_section', 'bulk_mark_complete']
                      },
                      params: { type: 'object', description: 'Operation parameters (name, content, tags, pageName, sectionName, filter, etc.)' }
                    },
                    required: ['type', 'params']
                  }
                }
              },
              required: ['title', 'description', 'operations']
            }
          }
        },
        required: ['summary', 'groups']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'revise_plan_step',
      description: `Revise a single step in an existing plan. Use this when the user requests changes to a specific step.
DO NOT use propose_plan for revisions - use this instead to update just the step being revised.

PARAM FORMATS (same as propose_plan):
- create_page: { name: "Page Name" }
- create_section: { name: "Section Name", pageName: "Page Name" }
- create_note: { content: "Note text", sectionName: "Section", tags: ["tag1"] }`,
      parameters: {
        type: 'object',
        properties: {
          step_index: { type: 'number', description: 'The 0-based index of the step to revise' },
          revised_group: {
            type: 'object',
            description: 'The revised group definition',
            properties: {
              title: { type: 'string', description: 'Short title for this group' },
              description: { type: 'string', description: 'What this group will do' },
              operations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: {
                      type: 'string',
                      enum: ['create_page', 'create_section', 'create_note', 'delete_note', 'delete_section', 'delete_page', 'bulk_add_tag', 'bulk_remove_tag', 'bulk_move_to_section', 'bulk_mark_complete']
                    },
                    params: { type: 'object', description: 'Operation parameters' }
                  },
                  required: ['type', 'params']
                }
              }
            },
            required: ['title', 'description', 'operations']
          },
          message: { type: 'string', description: 'Brief message about the revision' }
        },
        required: ['step_index', 'revised_group']
      }
    }
  }
];

// Combine shared functions with web-specific functions
export const functionDefinitions = [...SHARED_FUNCTIONS, ...WEB_SPECIFIC_FUNCTIONS];

// Re-export for backwards compatibility
export { TERMINAL_FUNCTIONS as terminalFunctions };
export { FRONTEND_ACTION_FUNCTIONS as frontendActions };
