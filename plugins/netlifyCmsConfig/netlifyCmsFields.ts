// Shared field definitions for Netlify CMS collections.
// Modify this file to change fields across all generated collections.
// Keep types narrow to avoid accidental schema drift.

export interface NetlifyCmsField {
  name: string;
  label: string;
  widget: string;
  required?: boolean;
  min?: number;
  fields?: NetlifyCmsField[]; // for object widget
}

// The base fields applied to each generated collection.
export const baseFields: NetlifyCmsField[] = [
  { name: 'id', label: 'Id', widget: 'string' },
  { name: 'title', label: 'Title', widget: 'string' },
  { name: 'subtitle', label: 'Subtitle', widget: 'string', required: false },
  // { name: 'sidebar_position', label: 'Sidebar Position', widget: 'number', required: false, min: 1},
  // {
  //   name: 'metadata',
  //   label: 'Metadata',
  //   widget: 'object',
  //   fields: [
  //     { name: 'pageId', label: 'Page ID', widget: 'string', required: false },
  //     { name: 'categoryId', label: 'Category ID', widget: 'string', required: false },
  //     { name: 'guideId', label: 'Guide ID', widget: 'string', required: false },
  //   ],
  // },
  { name: 'body', label: 'Body', widget: 'markdown' },
];

// If you need per-collection overrides in future, you can expose a helper:
// export function getFieldsForCollection(folder: string): NetlifyCmsField[] {
//   switch (folder) {
//     default:
//       return baseFields;
//   }
// }
