// Debug script to run in browser console
// Open browser DevTools (F12) and paste this in the Console tab

console.log('🔍 RTL Debug Script Starting...');

// Check if RTL class is applied
const rtlElements = document.querySelectorAll('.rtl-interface');
console.log('RTL interface elements found:', rtlElements.length);

// Check tree items
const treeItems = document.querySelectorAll('.tree-item');
console.log('Total tree items found:', treeItems.length);

// Check tree item styles
treeItems.forEach((item, index) => {
  if (index < 5) { // Only log first 5 to avoid spam
    const style = window.getComputedStyle(item);
    const inlineStyle = item.getAttribute('style');
    console.log(`Tree item ${index}:`, {
      hasRTLClass: item.closest('.rtl-interface') !== null,
      direction: style.direction,
      flexDirection: style.flexDirection,
      paddingLeft: style.paddingLeft,
      paddingRight: style.paddingRight,
      inlineStyle: inlineStyle,
      textContent: item.querySelector('.display-text')?.textContent?.trim()
    });
  }
});

// Check flex order of child elements
const firstTreeItem = treeItems[0];
if (firstTreeItem) {
  const children = firstTreeItem.children;
  console.log('First tree item child elements:');
  Array.from(children).forEach((child, index) => {
    const style = window.getComputedStyle(child);
    console.log(`  Child ${index} (${child.className}):`, {
      order: style.order,
      flexDirection: style.flexDirection
    });
  });
}

console.log('🔍 RTL Debug Script Complete');