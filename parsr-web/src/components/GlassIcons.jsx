import './GlassIcons.css';

const colorMapping = {
  blue: 'hsl(223, 70%, 60%)',
  purple: 'hsl(283, 70%, 60%)',
  red: 'hsl(3, 70%, 60%)',
  indigo: 'hsl(253, 70%, 60%)',
  orange: 'hsl(43, 70%, 60%)',
  green: 'hsl(123, 70%, 50%)',
  slate: 'hsl(210, 40%, 50%)',
  gray: 'hsl(220, 20%, 50%)'
};

const GlassIcons = ({ items, className }) => {
  const getBackgroundStyle = color => {
    if (colorMapping[color]) {
      return { backgroundColor: colorMapping[color] };
    }
    return { backgroundColor: color };
  };

  return (
    <div className={`icon-btns ${className || ''}`}>
      {items.map((item, index) => (
        <button
          key={index}
          className={`icon-btn ${item.customClass || ''}`}
          aria-label={item.label || 'Button'}
          type={item.type || "button"}
          onClick={item.onClick}
        >
          <span className="icon-btn__back" style={getBackgroundStyle(item.color)}></span>
          <span className="icon-btn__front">
            <span className="icon-btn__icon" aria-hidden="true">
              {item.icon}
            </span>
          </span>
          {item.label && <span className="icon-btn__label">{item.label}</span>}
        </button>
      ))}
    </div>
  );
};

export default GlassIcons;
