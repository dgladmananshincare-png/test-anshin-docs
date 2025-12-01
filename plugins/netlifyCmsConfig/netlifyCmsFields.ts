// Shared field definitions for Netlify CMS collections.
// Modify this file to change fields across all generated collections.
// Keep types narrow to avoid accidental schema drift.

export interface NetlifyCmsField {
  name: string;
  label: string;
  widget: string;
  required?: boolean;
  min?: number;
  pattern?: string[];
  hint?: string;
  default?: any;
  fields?: NetlifyCmsField[]; // for object widget
}

// The base fields applied to each generated collection.
export const baseFields: NetlifyCmsField[] = [
  { 
    name: 'id', 
    label: 'id', 
    widget: 'string', 
    pattern: ['^[a-z0-9]+(?:-[a-z0-9]+)*$', '半角英小文字、数字、ハイフンのみ使用できます。先頭・末尾のハイフンや連続するハイフンは使用できません。'],
    hint: 'IDには半角英小文字、数字、ハイフンのみを使用してください。先頭や末尾にハイフンを付けたり、連続してハイフンを使用しないでください。'
  },
  { 
    name: 'title', 
    label: 'タイトル', 
    widget: 'string', 
    pattern: ['^.{1,80}$', 'タイトルは1〜80文字で入力してください。']
  },
  { 
    name: 'subtitle', 
    label: 'サブタイトル', 
    widget: 'string', 
    required: false,
    pattern: ['^.{0,140}$', 'サブタイトルは140文字以内で入力してください。']
  },
  { name: 'sidebar_position', label: 'Sidebar Position', widget: 'hidden', default: "null"},
  {
    name: 'metadata',
    label: 'Metadata',
    widget: 'hidden',
    fields: [
      { name: 'pageId', label: 'Page ID', widget: 'hidden', required: false, default: "temp-000"},
      { name: 'categoryId', label: 'Category ID', widget: 'hidden', required: false, default: "temp-000" },
      { name: 'guideId', label: 'Guide ID', widget: 'hidden', required: false, default: "temp-000" },
    ],
  },
  { name: 'body', label: '本文', widget: 'markdown' },
];

// If you need per-collection overrides in future, you can expose a helper:
// export function getFieldsForCollection(folder: string): NetlifyCmsField[] {
//   switch (folder) {
//     default:
//       return baseFields;
//   }
// }
