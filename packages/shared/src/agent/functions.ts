/**
 * OpenAI function calling definitions for the Slate agent.
 * These define all available tools the agent can use.
 * CRITICAL: Both web backend and any mobile-specific backend must use these exact definitions.
 */

export type FunctionName =
  // Data queries
  | 'get_pages'
  | 'get_sections'
  | 'get_notes'
  | 'count_notes'
  // Page operations
  | 'create_page'
  | 'rename_page'
  | 'delete_page'
  // Section operations
  | 'create_section'
  | 'rename_section'
  | 'delete_section'
  | 'move_section'
  // Note operations
  | 'create_note'
  | 'update_note'
  | 'delete_note'
  | 'move_note'
  // Bulk operations
  | 'bulk_update_notes'
  | 'bulk_delete_notes'
  // Frontend navigation
  | 'navigate'
  | 'apply_filter'
  | 'clear_filters'
  | 'create_custom_view'
  // Communication (terminal)
  | 'respond_to_user'
  | 'ask_clarification'
  | 'confirm_action';

/**
 * Terminal functions end the agent loop.
 */
export const TERMINAL_FUNCTIONS: FunctionName[] = [
  'respond_to_user',
  'ask_clarification',
  'confirm_action',
];

/**
 * Frontend action functions - executed client-side, not on server.
 */
export const FRONTEND_ACTION_FUNCTIONS: FunctionName[] = [
  'navigate',
  'apply_filter',
  'clear_filters',
  'create_custom_view',
];

/**
 * OpenAI tool definitions.
 * Type matches OpenAI SDK's ChatCompletionTool interface.
 */
export const FUNCTION_DEFINITIONS = [
  // === DATA QUERIES ===
  {
    type: 'function' as const,
    function: {
      name: 'get_pages',
      description: 'Fetch all pages for the current user. Always call this first to see what exists.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_sections',
      description: 'Fetch sections, optionally filtered by page.',
      parameters: {
        type: 'object',
        properties: {
          page_id: { type: 'string', description: 'Filter by page ID' },
          page_name: { type: 'string', description: 'Filter by page name (case-insensitive)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_notes',
      description: 'Fetch notes with various filters. Use this to see existing tags and content.',
      parameters: {
        type: 'object',
        properties: {
          section_id: { type: 'string', description: 'Filter by section ID' },
          section_name: { type: 'string', description: 'Filter by section name' },
          page_name: { type: 'string', description: 'Filter by page name' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags (AND logic)' },
          has_no_tags: { type: 'boolean', description: 'Only notes without tags' },
          completed: { type: 'boolean', description: 'Filter by completion status' },
          search: { type: 'string', description: 'Full-text search in content' },
          limit: { type: 'number', description: 'Max notes to return (default 50)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'count_notes',
      description: 'Count notes matching criteria. Use before bulk operations to confirm scope.',
      parameters: {
        type: 'object',
        properties: {
          section_id: { type: 'string' },
          section_name: { type: 'string' },
          page_name: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          has_no_tags: { type: 'boolean' },
          completed: { type: 'boolean' },
          search: { type: 'string' },
        },
        required: [],
      },
    },
  },

  // === PAGE OPERATIONS ===
  {
    type: 'function' as const,
    function: {
      name: 'create_page',
      description: 'Create a new page.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Page name' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'rename_page',
      description: 'Rename an existing page.',
      parameters: {
        type: 'object',
        properties: {
          page_id: { type: 'string', description: 'Page ID' },
          page_name: { type: 'string', description: 'Current page name' },
          new_name: { type: 'string', description: 'New name' },
        },
        required: ['new_name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'delete_page',
      description: 'Delete a page and all its sections and notes. DESTRUCTIVE - requires confirmation.',
      parameters: {
        type: 'object',
        properties: {
          page_id: { type: 'string' },
          page_name: { type: 'string' },
        },
        required: [],
      },
    },
  },

  // === SECTION OPERATIONS ===
  {
    type: 'function' as const,
    function: {
      name: 'create_section',
      description: 'Create a new section in a page.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Section name' },
          page_id: { type: 'string', description: 'Parent page ID' },
          page_name: { type: 'string', description: 'Parent page name' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'rename_section',
      description: 'Rename an existing section.',
      parameters: {
        type: 'object',
        properties: {
          section_id: { type: 'string' },
          section_name: { type: 'string' },
          page_name: { type: 'string', description: 'Page name to disambiguate section' },
          new_name: { type: 'string', description: 'New section name' },
        },
        required: ['new_name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'delete_section',
      description: 'Delete a section and all its notes. DESTRUCTIVE - requires confirmation.',
      parameters: {
        type: 'object',
        properties: {
          section_id: { type: 'string' },
          section_name: { type: 'string' },
          page_name: { type: 'string' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'move_section',
      description: 'Move a section to a different page.',
      parameters: {
        type: 'object',
        properties: {
          section_id: { type: 'string' },
          section_name: { type: 'string' },
          to_page_id: { type: 'string', description: 'Target page ID' },
          to_page_name: { type: 'string', description: 'Target page name' },
        },
        required: [],
      },
    },
  },

  // === NOTE OPERATIONS ===
  {
    type: 'function' as const,
    function: {
      name: 'create_note',
      description: 'Create a new note. ALWAYS include relevant tags.',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'Note content' },
          section_id: { type: 'string', description: 'Target section ID' },
          section_name: { type: 'string', description: 'Target section name' },
          page_name: { type: 'string', description: 'Page name (if using section_name)' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Tags (1-3 recommended)' },
          date: { type: 'string', description: 'Optional date in "Mon D" format (e.g., "Jan 15")' },
        },
        required: ['content'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_note',
      description: 'Update an existing note.',
      parameters: {
        type: 'object',
        properties: {
          note_id: { type: 'string', description: 'Note ID to update' },
          content: { type: 'string', description: 'New content' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Replace all tags' },
          add_tags: { type: 'array', items: { type: 'string' }, description: 'Tags to add' },
          remove_tags: { type: 'array', items: { type: 'string' }, description: 'Tags to remove' },
          date: { type: 'string', description: 'New date or null to clear' },
          completed: { type: 'boolean', description: 'Completion status' },
        },
        required: ['note_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'delete_note',
      description: 'Delete a single note.',
      parameters: {
        type: 'object',
        properties: {
          note_id: { type: 'string', description: 'Note ID to delete' },
        },
        required: ['note_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'move_note',
      description: 'Move a note to a different section.',
      parameters: {
        type: 'object',
        properties: {
          note_id: { type: 'string', description: 'Note ID to move' },
          to_section_id: { type: 'string', description: 'Target section ID' },
          to_section_name: { type: 'string', description: 'Target section name' },
          to_page_name: { type: 'string', description: 'Page name (if using section_name)' },
        },
        required: ['note_id'],
      },
    },
  },

  // === BULK OPERATIONS ===
  {
    type: 'function' as const,
    function: {
      name: 'bulk_update_notes',
      description: 'Update multiple notes matching a filter. DESTRUCTIVE - requires confirmation.',
      parameters: {
        type: 'object',
        properties: {
          filter: {
            type: 'object',
            properties: {
              section_id: { type: 'string' },
              section_name: { type: 'string' },
              page_name: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
              has_no_tags: { type: 'boolean' },
              completed: { type: 'boolean' },
              search: { type: 'string' },
            },
          },
          updates: {
            type: 'object',
            properties: {
              add_tags: { type: 'array', items: { type: 'string' } },
              remove_tags: { type: 'array', items: { type: 'string' } },
              set_tags: { type: 'array', items: { type: 'string' } },
              completed: { type: 'boolean' },
              move_to_section_id: { type: 'string' },
              move_to_section_name: { type: 'string' },
            },
          },
        },
        required: ['filter', 'updates'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'bulk_delete_notes',
      description: 'Delete multiple notes matching a filter. DESTRUCTIVE - requires confirmation.',
      parameters: {
        type: 'object',
        properties: {
          filter: {
            type: 'object',
            properties: {
              section_id: { type: 'string' },
              section_name: { type: 'string' },
              page_name: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
              has_no_tags: { type: 'boolean' },
              completed: { type: 'boolean' },
              search: { type: 'string' },
            },
          },
        },
        required: ['filter'],
      },
    },
  },

  // === FRONTEND NAVIGATION ===
  {
    type: 'function' as const,
    function: {
      name: 'navigate',
      description: 'Navigate the UI to a specific page and optionally section.',
      parameters: {
        type: 'object',
        properties: {
          page_name: { type: 'string', description: 'Page to navigate to' },
          section_name: { type: 'string', description: 'Section within the page' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'apply_filter',
      description: 'Apply filters to the current view.',
      parameters: {
        type: 'object',
        properties: {
          tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags' },
          completed: { type: 'boolean', description: 'Filter by completion status' },
          search: { type: 'string', description: 'Search text' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'clear_filters',
      description: 'Clear all active filters and custom views.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_custom_view',
      description: 'Create a filtered view with custom grouping.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'View title' },
          view_type: { type: 'string', enum: ['list', 'boxes', 'calendar'], description: 'View layout' },
          filter: {
            type: 'object',
            properties: {
              tags: { type: 'array', items: { type: 'string' } },
              completed: { type: 'boolean' },
              search: { type: 'string' },
              page_name: { type: 'string' },
              section_name: { type: 'string' },
            },
          },
          group_by: {
            type: 'string',
            enum: ['section', 'page', 'tag', 'month', 'week', 'day', 'completed'],
            description: 'How to group results',
          },
        },
        required: ['title', 'view_type', 'filter'],
      },
    },
  },

  // === COMMUNICATION (Terminal) ===
  {
    type: 'function' as const,
    function: {
      name: 'respond_to_user',
      description: 'Send a response to the user. ALWAYS call this to end the conversation.',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Response message' },
        },
        required: ['message'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'ask_clarification',
      description: 'Ask the user for clarification when the request is ambiguous.',
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string', description: 'Clarifying question' },
          options: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string' },
                value: { type: 'string' },
              },
            },
            description: 'Quick-select options',
          },
        },
        required: ['question'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'confirm_action',
      description: 'Request confirmation for destructive actions.',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Confirmation message' },
          confirm_value: { type: 'string', description: 'Value to pass back when confirmed' },
        },
        required: ['message', 'confirm_value'],
      },
    },
  },
];
